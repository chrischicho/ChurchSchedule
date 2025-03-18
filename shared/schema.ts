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
  deadlineDay: integer("deadline_day").default(20).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true,
  firstLogin: true 
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  lastUpdated: true
});

export const updatePinSchema = z.object({
  currentPin: z.string().length(6),
  newPin: z.string().length(6)
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type UpdatePin = z.infer<typeof updatePinSchema>;
