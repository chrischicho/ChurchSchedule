import { IStorage } from "./storage.interface";
import { 
  users, availability, settings, verses, specialDays,
  InsertUser, User, 
  InsertAvailability, Availability, 
  Settings,
  Verse, InsertVerse,
  SpecialDay, InsertSpecialDay,
  UpdateProfile
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log(`Retrieved user: ${JSON.stringify(user)}`);
    return user;
  }

  async getUserByName(firstName: string, lastName: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.firstName, firstName), eq(users.lastName, lastName)));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      console.log(`Attempting to create user with data: ${JSON.stringify(insertUser)}`);
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          firstLogin: true,
          pin: "000000"
        })
        .returning();
      console.log(`Created new user: ${JSON.stringify(user)}`);
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error; // Re-throw to be handled by caller
    }
  }

  async deleteUser(id: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow deleting the last admin
    const adminCount = await db.select().from(users).where(eq(users.isAdmin, true));
    if (user.isAdmin && adminCount.length <= 1) {
      throw new Error("Cannot delete the last admin user");
    }

    // Delete user's availability records first
    await db.delete(availability).where(eq(availability.userId, id));
    // Then delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async updateUserPin(id: number, pin: string): Promise<User> {
    console.log(`Updating PIN for user ${id}`);
    const [user] = await db
      .update(users)
      .set({ 
        pin,
        firstLogin: false 
      })
      .where(eq(users.id, id))
      .returning();

    if (!user) throw new Error("User not found");
    console.log(`Updated user PIN: ${JSON.stringify(user)}`);
    return user;
  }

  async setAvailability(data: InsertAvailability): Promise<Availability> {
    // Convert date string to Date object for comparison
    const dateStr = new Date(data.serviceDate).toISOString().split('T')[0];

    // Find existing availability
    const [existing] = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.userId, data.userId),
          eq(availability.serviceDate, dateStr)
        )
      );

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(availability)
        .set({ 
          isAvailable: data.isAvailable,
          lastUpdated: new Date()
        })
        .where(eq(availability.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [created] = await db
        .insert(availability)
        .values({
          ...data,
          serviceDate: dateStr,
          lastUpdated: new Date()
        })
        .returning();
      return created;
    }
  }

  async getAvailability(): Promise<Availability[]> {
    return db.select().from(availability);
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Settings related methods
  async getSettings(): Promise<Settings> {
    // Get settings or create default if not exists
    const [existingSettings] = await db.select().from(settings);
    if (existingSettings) {
      return existingSettings;
    }

    // Create default settings if none exist
    const [defaultSettings] = await db
      .insert(settings)
      .values({
        deadlineDay: 20,
        nameFormat: 'full'
      })
      .returning();

    return defaultSettings;
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const [existingSettings] = await db.select().from(settings);

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(settings)
        .set(data)
        .where(eq(settings.id, existingSettings.id))
        .returning();
      return updated;
    }

    // Create new settings if none exist
    const [created] = await db
      .insert(settings)
      .values({
        deadlineDay: data.deadlineDay ?? 20,
        nameFormat: data.nameFormat ?? 'full'
      })
      .returning();
    return created;
  }

  private nameFormat: string = 'full';

  getNameFormat(): string {
    return this.nameFormat;
  }

  async setNameFormat(format: string): Promise<string> {
    this.nameFormat = format;
    return format;
  }

  formatUserName(user: User): string {
    switch (this.nameFormat) {
      case 'first':
        return user.firstName;
      case 'last':
        return user.lastName;
      case 'initials':
        return `${user.firstName[0]}${user.lastName[0]}`;
      default:
        return `${user.firstName} ${user.lastName}`;
    }
  }
  
  // Verse operations
  async getAllVerses(): Promise<Verse[]> {
    return db.select().from(verses);
  }
  
  async getRandomVerse(category: string = 'serving'): Promise<Verse | undefined> {
    const allVerses = await db.select().from(verses).where(eq(verses.category, category));
    if (allVerses.length === 0) return undefined;
    
    // Get a random verse
    const randomIndex = Math.floor(Math.random() * allVerses.length);
    return allVerses[randomIndex];
  }
  
  async createVerse(verse: InsertVerse): Promise<Verse> {
    const [created] = await db
      .insert(verses)
      .values(verse)
      .returning();
      
    return created;
  }
  
  async deleteVerse(id: number): Promise<void> {
    await db.delete(verses).where(eq(verses.id, id));
  }
  
  // Special Days operations
  async getSpecialDays(): Promise<SpecialDay[]> {
    return db.select().from(specialDays);
  }
  
  async getSpecialDaysByMonth(year: number, month: number): Promise<SpecialDay[]> {
    try {
      console.log(`Getting special days for year=${year}, month=${month}`);
      
      // Get all special days
      const allSpecialDays = await db.select().from(specialDays);
      console.log(`Total special days in database: ${allSpecialDays.length}`);
      
      if (allSpecialDays.length > 0) {
        console.log("Sample special day:", JSON.stringify(allSpecialDays[0]));
      }
      
      // Filter in memory for the specified month (adjust for JavaScript's 0-based months)
      const filteredDays = allSpecialDays.filter(day => {
        try {
          // Ensure proper Date object
          const dayDate = new Date(day.date);
          
          // Log for debugging
          console.log(`Checking date ${day.date}, parsed as ${dayDate.toISOString()}`);
          console.log(`Year: ${dayDate.getFullYear()}, Month: ${dayDate.getMonth() + 1}`);
          
          // Return true if the date matches year and month
          return dayDate.getFullYear() === year && dayDate.getMonth() === month - 1;
        } catch (error) {
          console.error(`Error parsing date ${day.date}:`, error);
          return false; // Skip this day if we can't parse the date
        }
      });
      
      console.log(`Filtered to ${filteredDays.length} days for ${year}-${month}`);
      return filteredDays;
    } catch (error) {
      console.error("Error in getSpecialDaysByMonth:", error);
      // Return empty array instead of crashing on error
      return [];
    }
  }
  
  async getSpecialDay(id: number): Promise<SpecialDay | undefined> {
    const [specialDay] = await db.select().from(specialDays).where(eq(specialDays.id, id));
    return specialDay;
  }
  
  async createSpecialDay(specialDay: InsertSpecialDay): Promise<SpecialDay> {
    try {
      // More robust date handling
      let dateStr: string;
      
      if (typeof specialDay.date === 'object' && specialDay.date !== null && 'toISOString' in specialDay.date) {
        // Handle Date object
        dateStr = (specialDay.date as Date).toISOString().split('T')[0];
      } else if (typeof specialDay.date === 'string') {
        // If it's already a string, try to ensure it's in YYYY-MM-DD format
        const parsedDate = new Date(specialDay.date);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format: ${specialDay.date}`);
        }
        dateStr = parsedDate.toISOString().split('T')[0];
      } else {
        // Handle unexpected type
        throw new Error(`Unexpected date type: ${typeof specialDay.date}`);
      }
      
      console.log(`Creating special day with formatted date: ${dateStr}`);
      
      const [created] = await db
        .insert(specialDays)
        .values({
          ...specialDay,
          date: dateStr,
        })
        .returning();
        
      console.log(`Successfully created special day: ${JSON.stringify(created)}`);
      return created;
    } catch (error) {
      console.error("Error in createSpecialDay:", error);
      throw error;
    }
  }
  
  async updateSpecialDay(id: number, specialDay: Partial<InsertSpecialDay>): Promise<SpecialDay> {
    try {
      console.log(`Updating special day with ID ${id}:`, JSON.stringify(specialDay));
      
      // Convert date to ISO string format if it's a Date object and exists
      const updateData: Partial<InsertSpecialDay> = { ...specialDay };
      
      if (updateData.date) {
        if (typeof updateData.date === 'object' && updateData.date !== null && 'toISOString' in updateData.date) {
          // Handle Date object
          updateData.date = (updateData.date as Date).toISOString().split('T')[0];
        } else if (typeof updateData.date === 'string') {
          // If it's already a string, try to ensure it's in YYYY-MM-DD format
          const parsedDate = new Date(updateData.date);
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Invalid date format: ${updateData.date}`);
          }
          updateData.date = parsedDate.toISOString().split('T')[0];
        }
      }
      
      console.log(`Processed update data:`, JSON.stringify(updateData));
      
      const [updated] = await db
        .update(specialDays)
        .set(updateData)
        .where(eq(specialDays.id, id))
        .returning();
        
      if (!updated) throw new Error("Special day not found");
      
      console.log(`Successfully updated special day:`, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error(`Error updating special day ${id}:`, error);
      throw error;
    }
  }
  
  async deleteSpecialDay(id: number): Promise<void> {
    await db.delete(specialDays).where(eq(specialDays.id, id));
  }
}

export const storage = new DatabaseStorage();