import { Router, type IRouter } from "express";
import si from "systeminformation";
import { authMiddleware, requireRole } from "../lib/auth";

const router: IRouter = Router();

const SRS_API_URL = process.env.SRS_API_URL || process.env.SRS_URL || "https://stream.domain.com";

router.get("/server/stats", authMiddleware, requireRole("admin", "operator"), async (_req, res) => {
  try {
    const [cpuLoad, mem, netStats, osTime] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.time(),
    ]);

    const cpuInfo = await si.cpu();

    let srsConnected = false;
    let activeConnections = 0;

    try {
      const srsResp = await fetch(`${SRS_API_URL}/api/v1/summaries`);
      if (srsResp.ok) {
        srsConnected = true;
        const data = (await srsResp.json()) as { data?: { self?: { connections?: number } } };
        if (data.data) {
          activeConnections = data.data.self?.connections || 0;
        }
      }
    } catch {
      srsConnected = false;
    }

    const externalNet = netStats.filter((n) => !n.iface.startsWith("lo"));
    let rxBytes = 0;
    let txBytes = 0;
    let rxPerSec = 0;
    let txPerSec = 0;

    for (const iface of externalNet) {
      rxBytes += iface.rx_bytes;
      txBytes += iface.tx_bytes;
      rxPerSec += iface.rx_sec;
      txPerSec += iface.tx_sec;
    }

    res.json({
      cpu: {
        usage: Math.round(cpuLoad.currentLoad * 100) / 100,
        cores: cpuInfo.cores,
        model: cpuInfo.brand || "Unknown",
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercent: Math.round((mem.used / mem.total) * 100 * 100) / 100,
      },
      network: {
        rxBytes,
        txBytes,
        rxPerSec: Math.round(rxPerSec),
        txPerSec: Math.round(txPerSec),
      },
      activeConnections,
      uptime: osTime.uptime,
      srsConnected,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get server stats";
    res.status(500).json({ error: message });
  }
});

export default router;
