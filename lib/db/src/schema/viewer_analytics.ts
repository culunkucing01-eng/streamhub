import { pgTable, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { channelsTable } from "./channels";

export const viewerAnalyticsTable = pgTable("viewer_analytics", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channelsTable.id),
  viewerCount: integer("viewer_count").notNull().default(0),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertViewerAnalyticsSchema = createInsertSchema(viewerAnalyticsTable).omit({ id: true });
export type InsertViewerAnalytics = z.infer<typeof insertViewerAnalyticsSchema>;
export type ViewerAnalytics = typeof viewerAnalyticsTable.$inferSelect;
