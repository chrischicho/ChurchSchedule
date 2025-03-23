import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const verses = pgTable("verses", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  reference: text("reference").notNull(),
  category: text("category").default("serving").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  initials: text("initials"), // Can be NULL initially, will be set based on first and last name
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

export const specialDays = pgTable("special_days", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#FFD700").notNull(), // Default to gold color
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

export const insertVerseSchema = createInsertSchema(verses).omit({
  id: true
});

export const insertSpecialDaySchema = createInsertSchema(specialDays).omit({
  id: true
});

export const updatePinSchema = z.object({
  currentPin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
  newPin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits")
});

export const customInitialsSchema = z.object({
  initials: z.string().min(1, "Initials are required").max(5, "Initials should be at most 5 characters")
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  initials: z.string().min(1, "Initials are required").max(5, "Initials should be at most 5 characters").optional(),
  currentPin: z.string().regex(/^\d{4,6}$/, "Current PIN must be 4-6 digits"),
  newPin: z.string().regex(/^\d{4,6}$/, "New PIN must be 4-6 digits").optional(),
  confirmPin: z.string().regex(/^\d{4,6}$/, "Confirm PIN must be 4-6 digits").optional(),
}).refine((data) => {
  // If newPin is provided, confirmPin must match
  if (data.newPin && data.newPin !== data.confirmPin) {
    return false;
  }
  return true;
}, {
  message: "PINs do not match",
  path: ["confirmPin"]
});

export const nameFormatSchema = z.enum(['full', 'first', 'last', 'initials']);

// Schema for validating deadline day
export const deadlineDaySchema = z.number().min(1).max(31);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Availability = typeof availability.$inferSelect;
export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type UpdatePin = z.infer<typeof updatePinSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type CustomInitials = z.infer<typeof customInitialsSchema>;
export type NameFormat = z.infer<typeof nameFormatSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Verse = typeof verses.$inferSelect;
export type InsertVerse = z.infer<typeof insertVerseSchema>;
export type SpecialDay = typeof specialDays.$inferSelect;
export type InsertSpecialDay = z.infer<typeof insertSpecialDaySchema>;