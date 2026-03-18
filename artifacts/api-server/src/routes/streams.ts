import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { channelsTable, usersTable, viewerAnalyticsTable, invoicesTable } from "@workspace/db/schema";
import { count, sum, desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router: IRouter = Router();

const SRS_API_URL = process.env.SRS_API_URL || process.env.SRS_URL || "https://stream.domain.com";

interface SrsStream {
  id?: string | number;
  name?: string;
  vhost?: string;
  app?: string;
  clients?: number;
  publish?: { cid?: string | number; active?: number };
  kbps?: { recv_30s?: number; send_30s?: number };
  video?: { codec?: string; width?: number; height?: number };
  audio?: { codec?: string };
}

interface SrsClient {
  id?: string | number;
  ip?: string;
  type?: string;
  url?: string;
  alive?: number;
}

interface SrsStreamsResponse {
  streams?: SrsStream[];
}

interface SrsClientsResponse {
  clients?: SrsClient[];
}

interface SrsSummariesResponse {
  data?: {
    kbps?: { recv_30s?: number; send_30s?: number };
    bytes?: { recv?: number; send?: number };
    self?: { connections?: number };
  };
}

async function fetchSRS<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${SRS_API_URL}${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

router.get("/streams/active", authMiddleware, async (_req, res) => {
  try {
    const srsData = await fetchSRS<SrsStreamsResponse>("/api/v1/streams/");
    const channels = await db.select().from(channelsTable);
    const channelMap = new Map(channels.map((c) => [c.streamKey, c]));

    if (srsData && srsData.streams) {
      // Deduplicate by stream name (keep highest bitrate entry per key)
      const bestByKey = new Map<string, SrsStream>();
      for (const s of srsData.streams) {
        const key = s.name || "";
        // Only consider streams that:
        // 1. Match a known channel stream key in our database
        // 2. Have an active publisher (someone is actually pushing RTMP right now)
        if (!channelMap.has(key)) continue;
        if (!s.publish?.active) continue;

        const existing = bestByKey.get(key);
        const currentBitrate = s.kbps?.recv_30s || 0;
        const existingBitrate = existing?.kbps?.recv_30s || 0;
        if (!existing || currentBitrate > existingBitrate) {
          bestByKey.set(key, s);
        }
      }

      const activeStreams = Array.from(bestByKey.values()).map((s) => {
        const streamName = s.name || "";
        const channel = channelMap.get(streamName)!;
        // SRS counts the publisher itself as a client, so subtract 1 for real viewers
        const rawClients = s.clients || 0;
        const viewers = Math.max(0, rawClients - 1);
        return {
          id: String(s.id || ""),
          name: streamName,
          channelName: channel.name,
          clientId: String(s.publish?.cid || ""),
          vhost: s.vhost || "",
          app: s.app || "live",
          stream: streamName,
          bitrate: (s.kbps?.recv_30s || 0) * 1000,
          viewers,
          uptime: s.publish?.active || 0,
          isOnline: true,
          videoCodec: s.video?.codec || "",
          audioCodec: s.audio?.codec || "",
          width: s.video?.width || 0,
          height: s.video?.height || 0,
        };
      });

      res.json(activeStreams);
    } else {
      // SRS unreachable — return empty list (don't fabricate data)
      res.json([]);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch streams";
    res.status(500).json({ error: message });
  }
});

router.get("/streams/clients", authMiddleware, async (_req, res) => {
  try {
    const srsData = await fetchSRS<SrsClientsResponse>("/api/v1/clients/");

    if (srsData && srsData.clients) {
      res.json({
        totalClients: srsData.clients.length,
        players: srsData.clients.filter((c) => c.type === "Play").length,
        publishers: srsData.clients.filter((c) => c.type === "Publish").length,
        clients: srsData.clients.map((c) => ({
          id: String(c.id || ""),
          ip: c.ip || "",
          type: c.type || "",
          url: c.url || "",
          alive: c.alive || 0,
        })),
      });
    } else {
      res.json({ totalClients: 0, players: 0, publishers: 0, clients: [] });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch clients";
    res.status(500).json({ error: message });
  }
});

router.get("/streams/bandwidth", authMiddleware, async (_req, res) => {
  try {
    const srsData = await fetchSRS<SrsSummariesResponse>("/api/v1/summaries");

    if (srsData && srsData.data) {
      const d = srsData.data;
      res.json({
        ingressBps: d.kbps?.recv_30s ? d.kbps.recv_30s * 1000 : 0,
        egressBps: d.kbps?.send_30s ? d.kbps.send_30s * 1000 : 0,
        ingressBytes: d.bytes?.recv || 0,
        egressBytes: d.bytes?.send || 0,
      });
    } else {
      res.json({ ingressBps: 0, egressBps: 0, ingressBytes: 0, egressBytes: 0 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch bandwidth";
    res.status(500).json({ error: message });
  }
});

router.get("/streams/stats", authMiddleware, async (_req, res) => {
  try {
    const [channelCount] = await db.select({ count: count() }).from(channelsTable);
    const [userCount] = await db.select({ count: count() }).from(usersTable);
    const [revenueResult] = await db.select({ total: sum(invoicesTable.amount) }).from(invoicesTable);

    let activeStreams = 0;
    let totalViewers = 0;
    let totalBandwidth = 0;

    const channels = await db.select().from(channelsTable);
    const channelMap = new Map(channels.map((c) => [c.streamKey, c]));

    const srsData = await fetchSRS<SrsStreamsResponse>("/api/v1/streams/");
    if (srsData && srsData.streams) {
      // Only count known channels with active publishers (same logic as /streams/active)
      const knownActive = srsData.streams.filter(
        (s) => channelMap.has(s.name || "") && s.publish?.active
      );
      // Deduplicate by stream name
      const uniqueKeys = new Set(knownActive.map((s) => s.name || ""));
      activeStreams = uniqueKeys.size;
      // Viewers: subtract 1 per stream for the publisher
      totalViewers = knownActive.reduce((acc: number, s) => acc + Math.max(0, (s.clients || 0) - 1), 0);
    }

    const bandwidthData = await fetchSRS<SrsSummariesResponse>("/api/v1/summaries");
    if (bandwidthData && bandwidthData.data) {
      totalBandwidth = (bandwidthData.data.kbps?.send_30s || 0) * 1000;
    }

    const recentAnalytics = await db
      .select()
      .from(viewerAnalyticsTable)
      .orderBy(desc(viewerAnalyticsTable.timestamp))
      .limit(24);

    res.json({
      totalChannels: channelCount.count,
      activeStreams,
      totalViewers,
      totalBandwidth,
      totalUsers: userCount.count,
      totalRevenue: Number(revenueResult.total || 0),
      recentViewerCounts: recentAnalytics.map((a) => ({
        timestamp: a.timestamp.toISOString(),
        count: a.viewerCount,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch stats";
    res.status(500).json({ error: message });
  }
});

export default router;
