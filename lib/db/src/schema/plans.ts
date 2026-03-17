import { pgTable, serial, text, timestamp, varchar, boolean, integer, numeric, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  interval: varchar("interval", { length: 20 }).notNull().default("monthly"),
  maxChannels: integer("max_channels").notNull().default(1),
  maxBitrate: integer("max_bitrate"),
  features: json("features").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlanSchema = createInsertSchema(subscriptionPlansTable).omit({ id: true, createdAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
