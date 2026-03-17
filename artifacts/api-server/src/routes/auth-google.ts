import { Router, type IRouter } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateToken } from "../lib/auth";

const router: IRouter = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const DOMAIN = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.APP_DOMAIN || "localhost:3001";
const CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `https://${DOMAIN}/api/auth/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || `https://${DOMAIN}`;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("No email from Google profile"));
          }

          const [existing] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);

          if (existing) {
            if (!existing.googleId) {
              await db
                .update(usersTable)
                .set({ googleId: profile.id, avatarUrl: profile.photos?.[0]?.value || null })
                .where(eq(usersTable.id, existing.id));
            }
            return done(null, existing);
          }

          const [newUser] = await db
            .insert(usersTable)
            .values({
              email,
              name: profile.displayName || email.split("@")[0],
              role: "user",
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value || null,
            })
            .returning();

          return done(null, newUser);
        } catch (err: unknown) {
          return done(err instanceof Error ? err : new Error("Google auth failed"));
        }
      }
    )
  );

  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["email", "profile"], session: false })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_URL}/?error=google_auth_failed` }),
    (req, res) => {
      const user = req.user as typeof usersTable.$inferSelect;
      const token = generateToken({ userId: user.id, email: user.email, role: user.role });
      res.redirect(`${FRONTEND_URL}/?token=${encodeURIComponent(token)}`);
    }
  );
} else {
  router.get("/auth/google", (_req, res) => {
    res.status(503).json({ error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
  });
}

export default router;
