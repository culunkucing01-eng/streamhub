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
      const activeStreams = srsData.streams.map((s) => {
        const streamName = s.name || "";
        const channel = channelMap.get(streamName);
        return {
          id: String(s.id || ""),
          name: streamName,
          channelName: channel?.name || streamName,
          clientId: String(s.publish?.cid || ""),
          vhost: s.vhost || "",
          app: s.app || "live",
          stream: streamName,
          bitrate: (s.kbps?.recv_30s || 0) * 1000,
          viewers: s.clients || 0,
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
      const mockStreams = channels
        .filter((c) => c.isActive)
        .slice(0, 2)
        .map((c) => ({
          id: String(c.id),
          name: c.streamKey,
          channelName: c.name,
          clientId: "",
          vhost: "",
          app: "live",
          stream: c.streamKey,
          bitrate: 0,
          viewers: 0,
          uptime: 0,
          isOnline: false,
          videoCodec: "",
          audioCodec: "",
          width: 0,
          height: 0,
        }));
      res.json(mockStreams);
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

    const srsData = await fetchSRS<SrsStreamsResponse>("/api/v1/streams/");
    if (srsData && srsData.streams) {
      activeStreams = srsData.streams.length;
      totalViewers = srsData.streams.reduce((acc: number, s) => acc + (s.clients || 0), 0);
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
