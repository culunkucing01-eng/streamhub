import { db } from "@workspace/db";
import { usersTable, channelsTable, subscriptionPlansTable } from "@workspace/db/schema";
import { hashPassword } from "./lib/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@streamhub.tv")).limit(1);
  if (existing.length === 0) {
    const hashedPw = await hashPassword("admin123");
    await db.insert(usersTable).values([
      { email: "admin@streamhub.tv", password: hashedPw, name: "Admin", role: "admin" },
      { email: "operator@streamhub.tv", password: await hashPassword("operator123"), name: "Operator", role: "operator" },
      { email: "user@streamhub.tv", password: await hashPassword("user123"), name: "Viewer", role: "user" },
      { email: "test@streamhub.tv", password: await hashPassword("test123"), name: "Test User", role: "user" },
    ]);
    console.log("Users seeded");
  } else {
    const testExists = await db.select().from(usersTable).where(eq(usersTable.email, "test@streamhub.tv")).limit(1);
    if (testExists.length === 0) {
      await db.insert(usersTable).values({ email: "test@streamhub.tv", password: await hashPassword("test123"), name: "Test User", role: "user" });
      console.log("Test user added");
    }
  }

  const existingChannels = await db.select().from(channelsTable).limit(1);
  if (existingChannels.length === 0) {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@streamhub.tv")).limit(1);
    if (admin) {
      await db.insert(channelsTable).values([
        { name: "Main Channel", description: "Primary broadcast channel", streamKey: crypto.randomBytes(16).toString("hex"), createdById: admin.id },
        { name: "News Channel", description: "24/7 news coverage", streamKey: crypto.randomBytes(16).toString("hex"), createdById: admin.id },
        { name: "Community Events", description: "Local community events and meetings", streamKey: crypto.randomBytes(16).toString("hex"), createdById: admin.id },
      ]);
      console.log("Channels seeded");
    }
  }

  const existingPlans = await db.select().from(subscriptionPlansTable).limit(1);
  if (existingPlans.length === 0) {
    await db.insert(subscriptionPlansTable).values([
      { name: "Basic", description: "Single channel, standard quality", price: "9.99", interval: "monthly", maxChannels: 1, maxBitrate: 2500, features: ["1 Channel", "720p Streaming", "Basic Analytics"] },
      { name: "Pro", description: "Multiple channels, HD quality", price: "29.99", interval: "monthly", maxChannels: 5, maxBitrate: 6000, features: ["5 Channels", "1080p Streaming", "Advanced Analytics", "Priority Support"] },
      { name: "Enterprise", description: "Unlimited channels, 4K support", price: "99.99", interval: "monthly", maxChannels: 100, maxBitrate: 15000, features: ["Unlimited Channels", "4K Streaming", "Full Analytics", "24/7 Support", "Custom Branding"] },
    ]);
    console.log("Subscription plans seeded");
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
