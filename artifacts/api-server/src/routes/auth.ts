import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { generateToken, hashPassword, comparePassword, authMiddleware, requireRole, type AuthenticatedRequest } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const body = LoginBody.parse(req.body);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);

    if (!user || !user.password || !(await comparePassword(body.password, user.password))) {
      if (user && !user.password) {
        res.status(401).json({ error: "This account uses Google login. Please sign in with Google." });
        return;
      }
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(400).json({ error: message });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const body = RegisterBody.parse(req.body);
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const hashedPassword = await hashPassword(body.password);
    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: "user",
      })
      .returning();

    const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ error: message });
  }
});

router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      googleId: user.googleId || null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get user";
    res.status(500).json({ error: message });
  }
});

router.put("/auth/profile", authMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).user.userId;
    const { name, currentPassword, newPassword } = req.body;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (name && typeof name === "string" && name.trim()) {
      updates.name = name.trim();
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: "Current password is required to set a new password" });
        return;
      }
      if (user.googleId && !user.password) {
        res.status(400).json({ error: "Google accounts cannot set a password this way" });
        return;
      }
      const valid = user.password ? await comparePassword(currentPassword, user.password) : false;
      if (!valid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }
      updates.password = await hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No changes provided" });
      return;
    }

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      avatarUrl: updated.avatarUrl || null,
      googleId: updated.googleId || null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update profile";
    res.status(500).json({ error: message });
  }
});

router.get("/users", authMiddleware, requireRole("admin"), async (_req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    }).from(usersTable);

    res.json(
      users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to list users";
    res.status(500).json({ error: message });
  }
});

export default router;
