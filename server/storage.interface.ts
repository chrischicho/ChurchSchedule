import { Store } from "express-session";
import { 
  User, InsertUser, 
  Availability, InsertAvailability, 
  Settings,
  Verse, InsertVerse,
  SpecialDay, InsertSpecialDay,
  ServiceRole, InsertServiceRole,
  RosterAssignment, InsertRosterAssignment,
  FinalizedRoster, InsertFinalizedRoster,
  UpdateProfile
} from "@shared/schema";

export interface IStorage {
  sessionStore: Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByName(firstName: string, lastName: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  updateUserPin(id: number, pin: string): Promise<User>;
  updateUserProfile(id: number, data: Partial<UpdateProfile>): Promise<User>;
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
  
  // Service Roles operations
  getAllServiceRoles(): Promise<ServiceRole[]>;
  getActiveServiceRoles(): Promise<ServiceRole[]>;
  getServiceRole(id: number): Promise<ServiceRole | undefined>;
  createServiceRole(role: InsertServiceRole): Promise<ServiceRole>;
  updateServiceRole(id: number, role: Partial<InsertServiceRole>): Promise<ServiceRole>;
  deleteServiceRole(id: number): Promise<void>;
  reorderServiceRoles(roleIds: number[]): Promise<ServiceRole[]>;
  
  // Roster Assignment operations
  getAllRosterAssignments(): Promise<RosterAssignment[]>;
  getRosterAssignmentsForDate(date: Date): Promise<RosterAssignment[]>;
  getRosterAssignmentsForMonth(year: number, month: number): Promise<RosterAssignment[]>;
  getRosterAssignmentsWithUserData(year: number, month: number): Promise<any[]>;  // Returns assignments with user and role data
  createRosterAssignment(assignment: InsertRosterAssignment): Promise<RosterAssignment>;
  updateRosterAssignment(id: number, assignment: Partial<InsertRosterAssignment>): Promise<RosterAssignment>;
  deleteRosterAssignment(id: number): Promise<void>;
  clearRosterAssignmentsForDate(date: Date): Promise<number>; // Returns the number of assignments that were deleted
  
  // Roster Builder Helper methods
  getAvailableSundaysWithPeople(year: number, month: number): Promise<any[]>;  // Returns Sundays with available people
  
  // Finalized roster operations
  getFinalizedRoster(year: number, month: number): Promise<FinalizedRoster | undefined>;
  finalizeRoster(data: InsertFinalizedRoster): Promise<FinalizedRoster>;
  unfinalizeRoster(year: number, month: number): Promise<void>;
  getAllFinalizedRosters(): Promise<FinalizedRoster[]>;
}
