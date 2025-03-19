import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  pin: text("pin").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  firstLogin: boolean("first_login").default(true).notNull(),
});

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  serviceDate: date("service_date").notNull(),
  isAvailable: boolean("is_available").default(false).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  deadlineDay: integer("deadline_day").default(20).notNull(), // Day of month (1-31) when availability updates are locked
  nameFormat: text("name_format").default("full").notNull(), // 'full' | 'first' | 'last' | 'initials'
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true 
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  lastUpdated: true
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true
});

export const updatePinSchema = z.object({
  currentPin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  newPin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
});

export const nameFormatSchema = z.enum(['full', 'first', 'last', 'initials']);

// Schema for validating deadline day
export const deadlineDaySchema = z.number().min(1).max(31);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type UpdatePin = z.infer<typeof updatePinSchema>;
export type NameFormat = z.infer<typeof nameFormatSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;