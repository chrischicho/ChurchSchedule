import { IStorage } from "./storage.interface";
import { User, InsertUser, Availability, InsertAvailability } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private availability: Map<number, Availability>;
  private currentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.availability = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByName(firstName: string, lastName: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firstName === firstName && user.lastName === lastName
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, firstLogin: true };
    this.users.set(id, user);
    return user;
  }

  async updateUserPin(id: number, pin: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, pin, firstLogin: false };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async setAvailability(data: InsertAvailability): Promise<Availability> {
    const id = this.currentId++;
    const availability: Availability = {
      ...data,
      id,
      lastUpdated: new Date()
    };
    this.availability.set(id, availability);
    return availability;
  }

  async getAvailability(): Promise<Availability[]> {
    return Array.from(this.availability.values());
  }
}

export const storage = new MemStorage();
