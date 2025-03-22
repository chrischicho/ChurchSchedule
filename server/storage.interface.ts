import { Store } from "express-session";
import { 
  User, InsertUser, 
  Availability, InsertAvailability, 
  Settings,
  Verse, InsertVerse,
  SpecialDay, InsertSpecialDay
} from "@shared/schema";

export interface IStorage {
  sessionStore: Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByName(firstName: string, lastName: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserPin(id: number, pin: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Availability operations
  setAvailability(data: InsertAvailability): Promise<Availability>;
  getAvailability(): Promise<Availability[]>;
  
  // Settings operations
  getSettings(): Promise<Settings>;
  updateSettings(data: Partial<Settings>): Promise<Settings>;
  
  // Name format operations
  getNameFormat(): string;
  setNameFormat(format: string): Promise<string>;
  formatUserName(user: User): string;
  
  // Verse operations
  getAllVerses(): Promise<Verse[]>;
  getRandomVerse(category?: string): Promise<Verse | undefined>;
  createVerse(verse: InsertVerse): Promise<Verse>;
  deleteVerse(id: number): Promise<void>;
  
  // Special Days operations
  getSpecialDays(): Promise<SpecialDay[]>;
  getSpecialDaysByMonth(year: number, month: number): Promise<SpecialDay[]>;
  getSpecialDay(id: number): Promise<SpecialDay | undefined>;
  createSpecialDay(specialDay: InsertSpecialDay): Promise<SpecialDay>;
  updateSpecialDay(id: number, specialDay: Partial<InsertSpecialDay>): Promise<SpecialDay>;
  deleteSpecialDay(id: number): Promise<void>;
}
