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
  private nameFormat: string = 'full';

  constructor() {
    this.users = new Map();
    this.availability = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000
    });

    // Initialize with test users
    this.createUser({
      firstName: "John",
      lastName: "Smith",
      pin: "000000",
      isAdmin: true
    });

    this.createUser({
      firstName: "Sarah",
      lastName: "Brown",
      pin: "000000",
      isAdmin: false
    });

    this.createUser({
      firstName: "Michael",
      lastName: "Johnson",
      pin: "000000",
      isAdmin: false
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
    // Find existing availability for this user and date
    const existingAvailability = Array.from(this.availability.values()).find(
      (a) => 
        a.userId === data.userId && 
        new Date(a.serviceDate).toISOString().split('T')[0] === new Date(data.serviceDate).toISOString().split('T')[0]
    );

    if (existingAvailability) {
      // Update existing availability
      const updated = {
        ...existingAvailability,
        isAvailable: data.isAvailable,
        lastUpdated: new Date()
      };
      this.availability.set(existingAvailability.id, updated);
      return updated;
    } else {
      // Create new availability
      const id = this.currentId++;
      const availability: Availability = {
        id,
        userId: data.userId,
        serviceDate: data.serviceDate,
        isAvailable: data.isAvailable,
        lastUpdated: new Date()
      };
      this.availability.set(id, availability);
      return availability;
    }
  }

  async getAvailability(): Promise<Availability[]> {
    const allAvailabilities = Array.from(this.availability.values());

    // Create a map to store the latest availability for each user and date
    const latestAvailabilities = new Map<string, Availability>();

    allAvailabilities.forEach(availability => {
      const key = `${availability.userId}-${availability.serviceDate}`;
      const existing = latestAvailabilities.get(key);

      if (!existing || existing.lastUpdated < availability.lastUpdated) {
        latestAvailabilities.set(key, availability);
      }
    });

    return Array.from(latestAvailabilities.values());
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

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
}

export const storage = new MemStorage();