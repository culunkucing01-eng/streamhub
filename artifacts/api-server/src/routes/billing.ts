import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subscriptionPlansTable, invoicesTable, subscriptionsTable, usersTable, channelsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  CreatePlanBody,
  UpdatePlanParams,
  UpdatePlanBody,
  DeletePlanParams,
  CreateSubscriptionBody,
} from "@workspace/api-zod";
import { authMiddleware, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    price: Number(p.price),
    interval: p.interval,
    maxChannels: p.maxChannels,
    maxBitrate: p.maxBitrate,
    features: p.features || [],
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/billing/plans", authMiddleware, async (_req, res) => {
  try {
    const plans = await db.select().from(subscriptionPlansTable);
    res.json(plans.map(serializePlan));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list plans";
    res.status(500).json({ error: message });
  }
});

router.post("/billing/plans", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const body = CreatePlanBody.parse(req.body);
    const [plan] = await db
      .insert(subscriptionPlansTable)
      .values({
        name: body.name,
        description: body.description,
        price: String(body.price),
        interval: body.interval,
        maxChannels: body.maxChannels,
        maxBitrate: body.maxBitrate,
        features: body.features || [],
      })
      .returning();

    res.status(201).json(serializePlan(plan));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create plan";
    res.status(400).json({ error: message });
  }
});

interface PlanUpdateFields {
  name?: string;
  description?: string;
  price?: string;
  maxChannels?: number;
  maxBitrate?: number;
  features?: string[];
  isActive?: boolean;
}

router.put("/billing/plans/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = UpdatePlanParams.parse({ id: req.params.id });
    const body = UpdatePlanBody.parse(req.body);

    const updates: PlanUpdateFields = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = String(body.price);
    if (body.maxChannels !== undefined) updates.maxChannels = body.maxChannels;
    if (body.maxBitrate !== undefined) updates.maxBitrate = body.maxBitrate;
    if (body.features !== undefined) updates.features = body.features;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const [plan] = await db.update(subscriptionPlansTable).set(updates).where(eq(subscriptionPlansTable.id, id)).returning();
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json(serializePlan(plan));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update plan";
    res.status(400).json({ error: message });
  }
});

router.delete("/billing/plans/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { id } = DeletePlanParams.parse({ id: req.params.id });
    const [plan] = await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).returning();
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    res.json({ message: "Plan deleted successfully" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete plan";
    res.status(400).json({ error: message });
  }
});

router.get("/billing/invoices", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdminOrOp = authReq.user.role === "admin" || authReq.user.role === "operator";
    const userIdParam = req.query.userId ? Number(req.query.userId) : undefined;
    const filterUserId = isAdminOrOp ? userIdParam : authReq.user.userId;

    const baseQuery = db
      .select({
        id: invoicesTable.id,
        userId: invoicesTable.userId,
        userName: usersTable.name,
        subscriptionId: invoicesTable.subscriptionId,
        amount: invoicesTable.amount,
        status: invoicesTable.status,
        dueDate: invoicesTable.dueDate,
        paidAt: invoicesTable.paidAt,
        description: invoicesTable.description,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .leftJoin(usersTable, eq(invoicesTable.userId, usersTable.id));

    const invoices = filterUserId
      ? await baseQuery.where(eq(invoicesTable.userId, filterUserId))
      : await baseQuery;

    res.json(
      invoices.map((inv) => ({
        id: inv.id,
        userId: inv.userId,
        userName: inv.userName || "",
        subscriptionId: inv.subscriptionId,
        amount: Number(inv.amount),
        status: inv.status,
        dueDate: inv.dueDate.toISOString(),
        paidAt: inv.paidAt?.toISOString() || null,
        description: inv.description || "",
        createdAt: inv.createdAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list invoices";
    res.status(500).json({ error: message });
  }
});

router.post("/billing/invoices", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { userId, subscriptionId, amount, dueDate, description } = req.body;
    if (!userId || !amount || !dueDate) {
      res.status(400).json({ error: "userId, amount, and dueDate are required" });
      return;
    }
    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        userId: Number(userId),
        subscriptionId: subscriptionId ? Number(subscriptionId) : undefined,
        amount: String(amount),
        dueDate: new Date(dueDate),
        description: description || undefined,
      })
      .returning();

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, invoice.userId)).limit(1);

    res.status(201).json({
      id: invoice.id,
      userId: invoice.userId,
      userName: user?.name || "",
      subscriptionId: invoice.subscriptionId,
      amount: Number(invoice.amount),
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
      description: invoice.description || "",
      createdAt: invoice.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invoice";
    res.status(400).json({ error: message });
  }
});

interface InvoiceUpdateFields {
  status: string;
  paidAt?: Date | null;
}

router.put("/billing/invoices/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: "Invalid invoice ID" });
      return;
    }
    const { status, paidAt } = req.body;
    const validStatuses = ["pending", "paid", "overdue", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const updates: InvoiceUpdateFields = { status };
    if (status === "paid") {
      updates.paidAt = paidAt ? new Date(paidAt) : new Date();
    } else if (paidAt !== undefined) {
      updates.paidAt = paidAt ? new Date(paidAt) : null;
    }

    const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, invoice.userId)).limit(1);

    res.json({
      id: invoice.id,
      userId: invoice.userId,
      userName: user?.name || "",
      subscriptionId: invoice.subscriptionId,
      amount: Number(invoice.amount),
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
      description: invoice.description || "",
      createdAt: invoice.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update invoice";
    res.status(400).json({ error: message });
  }
});

router.get("/billing/subscriptions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const isAdminOrOp = authReq.user.role === "admin" || authReq.user.role === "operator";

    const baseQuery = db
      .select({
        id: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        userName: usersTable.name,
        planId: subscriptionsTable.planId,
        planName: subscriptionPlansTable.name,
        channelId: subscriptionsTable.channelId,
        channelName: channelsTable.name,
        status: subscriptionsTable.status,
        startDate: subscriptionsTable.startDate,
        endDate: subscriptionsTable.endDate,
        createdAt: subscriptionsTable.createdAt,
      })
      .from(subscriptionsTable)
      .leftJoin(usersTable, eq(subscriptionsTable.userId, usersTable.id))
      .leftJoin(subscriptionPlansTable, eq(subscriptionsTable.planId, subscriptionPlansTable.id))
      .leftJoin(channelsTable, eq(subscriptionsTable.channelId, channelsTable.id));

    const subs = isAdminOrOp
      ? await baseQuery
      : await baseQuery.where(eq(subscriptionsTable.userId, authReq.user.userId));

    res.json(
      subs.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName || "",
        planId: s.planId,
        planName: s.planName || "",
        channelId: s.channelId,
        channelName: s.channelName || "",
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list subscriptions";
    res.status(500).json({ error: message });
  }
});

router.post("/billing/subscriptions", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const body = CreateSubscriptionBody.parse(req.body);

    const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, body.planId)).limit(1);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    if (plan.interval === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const [sub] = await db
      .insert(subscriptionsTable)
      .values({
        userId: body.userId,
        planId: body.planId,
        channelId: body.channelId,
        startDate,
        endDate,
      })
      .returning();

    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, sub.userId)).limit(1);
    const channelResult = body.channelId
      ? await db.select({ name: channelsTable.name }).from(channelsTable).where(eq(channelsTable.id, body.channelId)).limit(1)
      : [];

    res.status(201).json({
      id: sub.id,
      userId: sub.userId,
      userName: user?.name || "",
      planId: sub.planId,
      planName: plan.name,
      channelId: sub.channelId,
      channelName: channelResult[0]?.name || "",
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate.toISOString(),
      createdAt: sub.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create subscription";
    res.status(400).json({ error: message });
  }
});

export default router;
