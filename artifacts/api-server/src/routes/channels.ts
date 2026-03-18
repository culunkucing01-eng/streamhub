import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { channelsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  CreateChannelBody,
  GetChannelParams,
  UpdateChannelParams,
  UpdateChannelBody,
  DeleteChannelParams,
  RegenerateStreamKeyParams,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

const SRS_API_URL = process.env.SRS_API_URL || "http://localhost:1985";
const SRS_PLAYBACK_URL = process.env.SRS_PLAYBACK_URL || "http://localhost:8080";
const APP_DOMAIN = process.env.APP_DOMAIN || new URL(SRS_API_URL).hostname;

function generateStreamKey(): string {
  return crypto.randomBytes(16).toString("hex");
}

interface ChannelRow {
  id: number;
  name: string;
  description: string | null;
  streamKey: string;
  isActive: boolean;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

function buildChannelResponse(channel: ChannelRow) {
  return {
    id: channel.id,
    name: channel.name,
    description: channel.description || "",
    streamKey: channel.streamKey,
    rtmpUrl: `rtmp://${APP_DOMAIN}/live/${channel.streamKey}`,
    hlsUrl: `${SRS_PLAYBACK_URL}/live/${channel.streamKey}.m3u8`,
    mp4Url: `${SRS_PLAYBACK_URL}/live/${channel.streamKey}.mp4`,
    webrtcUrl: `${SRS_PLAYBACK_URL}/rtc/v1/whep/?app=live&stream=${channel.streamKey}`,
    isActive: channel.isActive,
    createdById: channel.createdById,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
  };
}

router.get("/channels", authMiddleware, async (_req, res) => {
  try {
    const channels = await db.select().from(channelsTable);
    res.json(channels.map(buildChannelResponse));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list channels";
    res.status(500).json({ error: message });
  }
});

router.post("/channels", authMiddleware, requireRole("admin", "operator"), async (req, res) => {
  try {
    const body = CreateChannelBody.parse(req.body);
    const userId = (req as AuthenticatedRequest).user.userId;

    const [channel] = await db
      .insert(channelsTable)
      .values({
        name: body.name,
        description: body.description,
        streamKey: generateStreamKey(),
        createdById: userId,
      })
      .returning();

    res.status(201).json(buildChannelResponse(channel));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create channel";
    res.status(400).json({ error: message });
  }
});

router.get("/channels/public/:id", async (req, res) => {
  try {
    const { id } = GetChannelParams.parse({ id: req.params.id });
    const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, id)).limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    const full = buildChannelResponse(channel);
    res.json({
      id: full.id,
      name: full.name,
      description: full.description,
      isActive: full.isActive,
      hlsUrl: full.hlsUrl,
      mp4Url: full.mp4Url,
      createdAt: full.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Channel not found";
    res.status(400).json({ error: message });
  }
});

router.get("/channels/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = GetChannelParams.parse({ id: req.params.id });
    const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, id)).limit(1);
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json(buildChannelResponse(channel));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Channel not found";
    res.status(400).json({ error: message });
  }
});

interface ChannelUpdateFields {
  name?: string;
  description?: string;
  isActive?: boolean;
  updatedAt: Date;
}

router.put("/channels/:id", authMiddleware, requireRole("admin", "operator"), async (req, res) => {
  try {
    const { id } = UpdateChannelParams.parse({ id: req.params.id });
    const body = UpdateChannelBody.parse(req.body);

    const updates: ChannelUpdateFields = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [channel] = await db
      .update(channelsTable)
      .set(updates)
      .where(eq(channelsTable.id, id))
      .returning();

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json(buildChannelResponse(channel));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update channel";
    res.status(400).json({ error: message });
  }
});

router.delete("/channels/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = DeleteChannelParams.parse({ id: req.params.id });
    const [channel] = await db.delete(channelsTable).where(eq(channelsTable.id, id)).returning();
    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json({ message: "Channel deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete channel";
    res.status(400).json({ error: message });
  }
});

router.post("/channels/:id/regenerate-key", authMiddleware, requireRole("admin", "operator"), async (req, res) => {
  try {
    const { id } = RegenerateStreamKeyParams.parse({ id: req.params.id });
    const newKey = generateStreamKey();

    const [channel] = await db
      .update(channelsTable)
      .set({ streamKey: newKey, updatedAt: new Date() })
      .where(eq(channelsTable.id, id))
      .returning();

    if (!channel) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json(buildChannelResponse(channel));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to regenerate key";
    res.status(400).json({ error: message });
  }
});

export default router;
