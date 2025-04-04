import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { 
  insertAvailabilitySchema, 
  deadlineDaySchema, 
  User, 
  insertVerseSchema, 
  insertSpecialDaySchema,
  insertServiceRoleSchema,
  insertRosterAssignmentSchema,
  insertFinalizedRosterSchema,
  updateProfileSchema,
  updateMemberNameSchema,
  Verse,
  RosterAssignment,
  FinalizedRoster
} from "@shared/schema";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { format } from "date-fns";
import { RosterPDF } from "../client/src/components/roster-pdf";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Get all users (for login dropdown)
  app.get("/api/users", async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin routes
  app.get("/api/admin/members", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Add settings endpoints
  app.get("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const { deadlineDay } = req.body;
      deadlineDaySchema.parse(deadlineDay); // Validate the day is between 1-31
      const settings = await storage.updateSettings({ deadlineDay });
      res.json(settings);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ message: "Invalid deadline day" });
      } else {
        res.status(500).json({ message: "Failed to update settings" });
      }
    }
  });

  app.post("/api/admin/members", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      console.log("Creating member with data:", req.body);
      const user = await storage.createUser({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        pin: "000000",
        isAdmin: false,
        firstLogin: true
      });
      res.status(201).json(user);
    } catch (err) {
      console.error("Error creating member:", err);
      if (err instanceof Error) {
        res.status(500).json({ message: `Failed to create member: ${err.message}` });
      } else {
        res.status(500).json({ message: "Failed to create member" });
      }
    }
  });

  app.delete("/api/admin/members/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      await storage.deleteUser(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to delete member" });
      }
    }
  });
  
  // Update member initials
  app.patch("/api/admin/members/:id/initials", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const userId = parseInt(req.params.id);
      const { initials } = req.body;
      
      if (!initials || typeof initials !== 'string') {
        return res.status(400).json({ message: "Valid initials are required" });
      }
      
      // Update the user profile with custom initials
      const updatedUser = await storage.updateUserProfile(userId, {
        customInitials: initials
      });
      
      res.json(updatedUser);
    } catch (err) {
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to update member initials" });
      }
    }
  });
  
  // Endpoint to update member name
  app.patch("/api/admin/members/:id/name", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      // Validate the request using our schema
      const parseResult = updateMemberNameSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid name data", 
          errors: parseResult.error.errors 
        });
      }
      
      const { firstName, lastName } = parseResult.data;
      
      // Update the user profile with new name
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName
      });
      
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating member name:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to update member name" });
      }
    }
  });

  app.get("/api/admin/name-format", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const format = storage.getNameFormat();
      res.json({ format });
    } catch (err) {
      res.status(500).json({ message: "Failed to get name format" });
    }
  });

  app.post("/api/admin/name-format", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const format = await storage.setNameFormat(req.body.format);
      res.json({ format });
    } catch (err) {
      res.status(500).json({ message: "Failed to update name format" });
    }
  });
  
  // Test API for email configuration
  app.get("/api/admin/test-email", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      console.log("Testing email configuration");
      // For Gmail with port 465, we should set secure to true
      const port = parseInt(process.env.SMTP_PORT || "587");
      const secure = port === 465 || process.env.SMTP_SECURE === "true";
      
      console.log("Email settings:", {
        host: process.env.SMTP_HOST,
        port,
        secure,
        user: process.env.SMTP_USER ? "Set" : "Not set",
        pass: process.env.SMTP_PASS ? "Set" : "Not set",
        from: process.env.SMTP_FROM,
      });
      
      // Configure email transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        debug: true,
        logger: true, // This will log details to the console
        tls: {
          // Disable TLS verification (not recommended for production)
          rejectUnauthorized: false
        }
      });
      
      try {
        // Verify the connection configuration
        const verification = await transporter.verify();
        console.log("Email verification result:", verification);
        res.json({ success: true, message: "Email configuration is valid" });
      } catch (verifyError) {
        const error = verifyError as Error;
        console.error("Email verification failed:", error);
        res.status(500).json({ 
          success: false, 
          error: "Email configuration is invalid", 
          details: error.message
        });
      }
    } catch (err) {
      console.error("Error testing email:", err);
      res.status(500).json({ success: false, error: "Failed to test email configuration" });
    }
  });

  app.post("/api/admin/send-roster", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const { email, month, viewType } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      // Use the selected month or default to current month
      const selectedMonth = month ? new Date(month) : new Date();
      console.log("Selected month for service roster:", selectedMonth.toISOString());
      
      // Get actual roster assignments with user and role data
      const assignments = await storage.getRosterAssignmentsWithUserData(
        selectedMonth.getFullYear(), 
        selectedMonth.getMonth() + 1
      );
      
      console.log("Total roster assignments found:", assignments.length);
      
      // Group assignments by service date and role
      const serviceRoster: { 
        [dateStr: string]: { 
          [roleName: string]: User[] 
        } 
      } = {};
      
      // Process assignments to build the service roster
      assignments.forEach(assignment => {
        // Skip if missing required data
        if (!assignment.user || !assignment.role) return;
        
        // Format date consistently for lookup
        const serviceDate = new Date(assignment.serviceDate);
        const dateStr = serviceDate.toISOString();
        
        // Initialize date entry if needed
        if (!serviceRoster[dateStr]) {
          serviceRoster[dateStr] = {};
        }
        
        // Initialize role entry if needed
        const roleName = assignment.role.name;
        if (!serviceRoster[dateStr][roleName]) {
          serviceRoster[dateStr][roleName] = [];
        }
        
        // Add user to assigned role
        serviceRoster[dateStr][roleName].push(assignment.user);
      });
      
      console.log("Service dates with assignments:", Object.keys(serviceRoster).length);
      
      // Get a random verse for the PDF
      const verse = await storage.getRandomVerse('serving');
      
      // Create the PDF document with our data
      console.log("Creating PDF with service roster data");
      
      // Create PDF element using appropriate props based on viewType
      let pdfProps: {
        month: Date;
        serviceRoster?: { [dateStr: string]: { [roleName: string]: User[] } };
        rosterData?: { [key: string]: User[] };
        viewType: "card" | "simple" | "roles";
        verse?: typeof verse;
      };
      
      if (viewType === "roles") {
        // For roles view, use service roster data
        pdfProps = { 
          month: selectedMonth, 
          serviceRoster: serviceRoster,
          viewType: "roles" as const, 
          verse: verse
        };
      } else {
        // For availability views (card or simple), get availability data
        // and format it for the legacy PDF format
        const availabilityData = await storage.getAvailability();
        
        // Process availability data for the selected month
        const rosterData: { [key: string]: User[] } = {};
        
        // Only include records for the selected month that are marked as available
        const availableRecords = availabilityData.filter(record => {
          const date = new Date(record.serviceDate);
          return date.getMonth() === selectedMonth.getMonth() && 
                date.getFullYear() === selectedMonth.getFullYear() &&
                record.isAvailable;
        });
        
        // Process each record and get the associated user
        for (const record of availableRecords) {
          // Format date for lookup
          const date = new Date(record.serviceDate);
          const dateStr = date.toISOString();
          
          // Initialize date entry if needed
          if (!rosterData[dateStr]) {
            rosterData[dateStr] = [];
          }
          
          // Find the user for this availability record
          const user = await storage.getUser(record.userId);
          if (user) {
            rosterData[dateStr].push(user);
          }
        }
          
        pdfProps = { 
          month: selectedMonth, 
          rosterData: rosterData,
          viewType: viewType as "card" | "simple", 
          verse: verse
        };
      }
      
      const rosterPDFElement = createElement(RosterPDF, pdfProps) as any;
      
      // Generate PDF buffer from the component
      const pdfBuffer = await renderToBuffer(rosterPDFElement);

      try {
        // For Gmail with port 465, we should set secure to true
        const port = parseInt(process.env.SMTP_PORT || "587");
        const secure = port === 465 || process.env.SMTP_SECURE === "true";
        
        console.log("Setting up email with", {
          host: process.env.SMTP_HOST,
          port,
          secure,
          user: process.env.SMTP_USER ? "Set" : "Not set",
          pass: process.env.SMTP_PASS ? "Set" : "Not set",
        });
        
        // Configure email transporter
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
          // Add debug for troubleshooting
          debug: true,
          // Increase timeout to allow for slower connections
          connectionTimeout: 10000, // 10 seconds
          greetingTimeout: 10000,
          socketTimeout: 30000, // 30 seconds
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          }
        });

        // Verify the connection configuration
        await transporter.verify();
        console.log("Email transporter verified successfully");
        
        // Format month name and year for the email subject
        const monthName = selectedMonth.toLocaleString('default', { month: 'long' });
        const year = selectedMonth.getFullYear();
        
        // Send email
        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: `Church Service Roster - ${monthName} ${year}`,
          text: `Please find attached the church service roster for ${monthName} ${year}.`,
          attachments: [
            {
              filename: `roster-${monthName.toLowerCase()}-${year}.pdf`,
              content: pdfBuffer,
            },
          ],
        });
        
        console.log("Email sent successfully:", info.messageId);
      } catch (error) {
        const emailError = error as Error;
        console.error("Email sending error details:", emailError);
        throw new Error(`Email sending failed: ${emailError.message}`);
      }

      res.json({ message: "Roster sent successfully" });
    } catch (err) {
      console.error("Error sending roster:", err);
      res.status(500).json({ message: "Failed to send roster" });
    }
  });

  app.post("/api/availability", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertAvailabilitySchema.parse(req.body);
      const settings = await storage.getSettings();

      const serviceDate = new Date(data.serviceDate);
      const today = new Date();

      if (!req.user.isAdmin) {
        if (serviceDate.getMonth() === today.getMonth() &&
            serviceDate.getFullYear() === today.getFullYear() &&
            today.getDate() > settings.deadlineDay) {
          // Return 200 status with notice type instead of 403
          return res.status(200).json({ 
            message: "Sorry, it has passed the deadline. If you want to change your availability for this month, please contact the coordinator",
            type: "notice" 
          });
        }
      }

      const availability = await storage.setAvailability(data);
      res.json(availability);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ message: "Invalid availability data" });
      } else {
        res.status(500).json({ message: "Failed to save availability" });
      }
    }
  });

  app.get("/api/availability", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const availability = await storage.getAvailability();
      res.json(availability);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });
  
  // Verse endpoints
  app.get("/api/verse/random", async (req, res) => {
    try {
      const category = req.query.category as string || 'serving';
      const verse = await storage.getRandomVerse(category);
      
      if (!verse) {
        return res.status(404).json({ message: "No verses found" });
      }
      
      res.json(verse);
    } catch (err) {
      console.error("Error fetching random verse:", err);
      res.status(500).json({ message: "Failed to fetch random verse" });
    }
  });

  app.get("/api/admin/verses", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const verses = await storage.getAllVerses();
      res.json(verses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch verses" });
    }
  });

  app.post("/api/admin/verses", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const data = insertVerseSchema.parse(req.body);
      const verse = await storage.createVerse(data);
      res.status(201).json(verse);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ message: "Invalid verse data" });
      } else {
        res.status(500).json({ message: "Failed to create verse" });
      }
    }
  });

  app.delete("/api/admin/verses/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      await storage.deleteVerse(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete verse" });
    }
  });
  
  // Special Days endpoints
  app.get("/api/special-days", async (req, res) => {
    try {
      const specialDays = await storage.getSpecialDays();
      res.json(specialDays);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch special days" });
    }
  });
  
  app.get("/api/special-days/month", async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      
      // Add logging for debugging
      console.log(`Fetching special days for year=${year}, month=${month}`);
      
      const specialDays = await storage.getSpecialDaysByMonth(year, month);
      console.log(`Found ${specialDays?.length || 0} special days`);
      
      // Always return an array, even if empty
      res.json(specialDays || []);
    } catch (err) {
      console.error("Error in /api/special-days/month:", err);
      res.status(500).json({ message: "Failed to fetch special days for month" });
    }
  });
  
  app.get("/api/admin/special-days/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      const specialDay = await storage.getSpecialDay(parseInt(req.params.id));
      if (!specialDay) {
        return res.status(404).json({ message: "Special day not found" });
      }
      res.json(specialDay);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch special day" });
    }
  });
  
  app.post("/api/admin/special-days", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      console.log("Creating special day with data:", JSON.stringify(req.body));
      
      // Validate the request body format first
      if (req.body.date) {
        try {
          if (typeof req.body.date === 'string') {
            // Try to parse and standardize the date format
            const parsed = new Date(req.body.date);
            if (!isNaN(parsed.getTime())) {
              // If valid date, standardize format to YYYY-MM-DD
              req.body.date = parsed.toISOString().split('T')[0];
              console.log("Standardized date format:", req.body.date);
            } else {
              console.error("Invalid date format received:", req.body.date);
              return res.status(400).json({ message: "Invalid date format" });
            }
          } else if (typeof req.body.date === 'object' && req.body.date !== null) {
            // Handle case when client sends a Date object in JSON
            console.log("Date is an object:", JSON.stringify(req.body.date));
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          return res.status(400).json({ message: "Invalid date format" });
        }
      } else {
        console.error("No date provided in request");
        return res.status(400).json({ message: "Date is required" });
      }
      
      // Validate against schema
      try {
        const data = insertSpecialDaySchema.parse(req.body);
        console.log("Parsed data:", JSON.stringify(data));
        
        const specialDay = await storage.createSpecialDay(data);
        console.log("Created special day:", JSON.stringify(specialDay));
        
        res.status(201).json(specialDay);
      } catch (err) {
        if (err instanceof ZodError) {
          console.error("Validation error:", JSON.stringify(err.errors));
          res.status(400).json({ 
            message: "Invalid special day data", 
            errors: err.errors 
          });
        } else {
          throw err; // Re-throw for the outer catch block
        }
      }
    } catch (err) {
      console.error("Error creating special day:", err);
      res.status(500).json({ 
        message: "Failed to create special day",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  app.patch("/api/admin/special-days/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      console.log("Update special day request received for ID:", req.params.id);
      console.log("Request body:", JSON.stringify(req.body));
      
      const id = parseInt(req.params.id);
      
      // Validate the request body format
      if (req.body.date && typeof req.body.date === 'string') {
        try {
          // Try to parse and standardize the date format
          const parsed = new Date(req.body.date);
          if (!isNaN(parsed.getTime())) {
            // If valid date, standardize format to YYYY-MM-DD
            req.body.date = parsed.toISOString().split('T')[0];
            console.log("Standardized date format:", req.body.date);
          } else {
            console.error("Invalid date format received:", req.body.date);
            return res.status(400).json({ message: "Invalid date format" });
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          return res.status(400).json({ message: "Invalid date format" });
        }
      }
      
      const specialDay = await storage.updateSpecialDay(id, req.body);
      console.log("Special day successfully updated:", JSON.stringify(specialDay));
      res.json(specialDay);
    } catch (err) {
      console.error("Error updating special day:", err);
      
      if (err instanceof Error && err.message === "Special day not found") {
        res.status(404).json({ message: err.message });
      } else if (err instanceof ZodError) {
        console.error("Validation error:", JSON.stringify(err.errors));
        res.status(400).json({ 
          message: "Invalid special day data", 
          errors: err.errors 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to update special day",
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  });
  
  app.delete("/api/admin/special-days/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }
    
    try {
      await storage.deleteSpecialDay(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete special day" });
    }
  });
  
  // Service Roles endpoints
  app.get("/api/service-roles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Return active roles for non-admin users
      if (!req.user.isAdmin) {
        const roles = await storage.getActiveServiceRoles();
        return res.json(roles);
      }
      
      // Return all roles for admins
      const roles = await storage.getAllServiceRoles();
      res.json(roles);
    } catch (err) {
      console.error("Error fetching service roles:", err);
      res.status(500).json({ message: "Failed to fetch service roles" });
    }
  });
  
  app.post("/api/admin/service-roles", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const data = insertServiceRoleSchema.parse(req.body);
      const role = await storage.createServiceRole(data);
      res.status(201).json(role);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ message: "Invalid service role data" });
      } else {
        console.error("Error creating service role:", err);
        res.status(500).json({ message: "Failed to create service role" });
      }
    }
  });
  
  app.patch("/api/admin/service-roles/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      const role = await storage.updateServiceRole(id, req.body);
      res.json(role);
    } catch (err) {
      console.error("Error updating service role:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to update service role" });
      }
    }
  });
  
  app.delete("/api/admin/service-roles/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      await storage.deleteServiceRole(id);
      res.sendStatus(200);
    } catch (err) {
      console.error("Error deleting service role:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to delete service role" });
      }
    }
  });
  
  app.post("/api/admin/service-roles/reorder", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const { roleIds } = req.body;
      if (!Array.isArray(roleIds)) {
        return res.status(400).json({ message: "Role IDs must be an array" });
      }
      
      const roles = await storage.reorderServiceRoles(roleIds);
      res.json(roles);
    } catch (err) {
      console.error("Error reordering service roles:", err);
      res.status(500).json({ message: "Failed to reorder service roles" });
    }
  });
  
  // Roster Assignment endpoints
  app.get("/api/admin/roster-assignments/all", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const assignments = await storage.getAllRosterAssignments();
      res.json(assignments);
    } catch (err) {
      console.error("Error fetching all roster assignments:", err);
      res.status(500).json({ message: "Failed to fetch all roster assignments" });
    }
  });
  
  app.get("/api/admin/roster-assignments/months", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      // Get all assignments
      const assignments = await storage.getAllRosterAssignments();
      
      // Extract unique months from assignments
      const months = new Set<string>();
      assignments.forEach((assignment: RosterAssignment) => {
        const date = new Date(assignment.serviceDate);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthYear);
      });
      
      // Convert to array of month objects
      const monthsArray = Array.from(months).map(monthStr => {
        const [year, month] = monthStr.split('-').map(Number);
        return {
          year,
          month,
          date: new Date(year, month - 1, 1).toISOString()
        };
      });
      
      // Sort by date (most recent first)
      monthsArray.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, 1);
        const dateB = new Date(b.year, b.month - 1, 1);
        return dateB.getTime() - dateA.getTime();
      });
      
      res.json(monthsArray);
    } catch (err) {
      console.error("Error fetching roster assignment months:", err);
      res.status(500).json({ message: "Failed to fetch roster assignment months" });
    }
  });
  
  app.get("/api/roster-assignments/month/:year/:month", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const assignments = await storage.getRosterAssignmentsWithUserData(year, month);
      res.json(assignments);
    } catch (err) {
      console.error("Error fetching roster assignments:", err);
      res.status(500).json({ message: "Failed to fetch roster assignments" });
    }
  });
  
  app.post("/api/admin/roster-assignments", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const data = insertRosterAssignmentSchema.parse(req.body);
      const assignment = await storage.createRosterAssignment(data);
      res.status(201).json(assignment);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ 
          message: "Invalid roster assignment data",
          errors: err.errors
        });
      } else if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to create roster assignment" });
      }
    }
  });
  
  app.patch("/api/admin/roster-assignments/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateRosterAssignment(id, req.body);
      res.json(assignment);
    } catch (err) {
      console.error("Error updating roster assignment:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Failed to update roster assignment" });
      }
    }
  });
  
  app.delete("/api/admin/roster-assignments/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRosterAssignment(id);
      // Return a JSON response instead of text "OK"
      res.status(200).json({ message: "Assignment deleted successfully" });
    } catch (err) {
      console.error("Error deleting roster assignment:", err);
      res.status(500).json({ message: "Failed to delete roster assignment" });
    }
  });
  
  app.delete("/api/admin/roster-assignments/date/:year/:month/:day", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month) - 1; // JS months are 0-indexed
      const day = parseInt(req.params.day);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.error(`Invalid date parameters: year=${req.params.year}, month=${req.params.month}, day=${req.params.day}`);
        return res.status(400).json({ message: "Invalid date parameters" });
      }
      
      console.log(`Clearing assignments for date: ${year}-${month+1}-${day}`);
      const date = new Date(year, month, day);
      
      if (isNaN(date.getTime())) {
        console.error(`Invalid date created: ${date}`);
        return res.status(400).json({ message: "Invalid date" });
      }
      
      console.log(`Parsed date: ${date.toISOString()}`);
      
      const deletedCount = await storage.clearRosterAssignmentsForDate(date);
      console.log(`Successfully cleared ${deletedCount} assignments`);
      
      res.status(200).json({ 
        success: true,
        deleted: deletedCount,
        date: date.toISOString().split('T')[0] 
      });
    } catch (err) {
      console.error("Error clearing roster assignments for date:", err);
      res.status(500).json({ message: "Failed to clear roster assignments" });
    }
  });
  
  // Roster Builder helper endpoints
  app.get("/api/roster-builder/available-sundays/:year/:month", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const sundays = await storage.getAvailableSundaysWithPeople(year, month);
      res.json(sundays);
    } catch (err) {
      console.error("Error fetching available Sundays:", err);
      res.status(500).json({ message: "Failed to fetch available Sundays" });
    }
  });
  
  // Finalized Roster Endpoints
  
  // Get all finalized rosters
  app.get("/api/admin/finalized-rosters", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const finalizedRosters = await storage.getAllFinalizedRosters();
      res.json(finalizedRosters);
    } catch (err) {
      console.error("Error fetching finalized rosters:", err);
      res.status(500).json({ message: "Failed to fetch finalized rosters" });
    }
  });
  
  // Get a specific finalized roster by year and month
  app.get("/api/finalized-roster/:year/:month", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      const finalizedRoster = await storage.getFinalizedRoster(year, month);
      
      if (!finalizedRoster) {
        return res.status(404).json({ message: "Roster not found or not finalized yet" });
      }
      
      // Get the roster assignments with user data for the month
      const assignments = await storage.getRosterAssignmentsWithUserData(year, month);
      
      res.json({
        finalizedRoster,
        assignments
      });
    } catch (err) {
      console.error("Error fetching finalized roster:", err);
      res.status(500).json({ message: "Failed to fetch finalized roster" });
    }
  });
  
  // Finalize a roster (admin only)
  app.post("/api/admin/finalize-roster", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      // Modify the incoming data to set the current user ID as createdBy
      const data = {
        ...req.body,
        createdBy: req.user.id
      };
      
      const parseResult = insertFinalizedRosterSchema.safeParse(data);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid finalized roster data",
          errors: parseResult.error.errors 
        });
      }
      
      const finalizedRoster = await storage.finalizeRoster(parseResult.data);
      res.status(201).json(finalizedRoster);
    } catch (err) {
      console.error("Error finalizing roster:", err);
      res.status(500).json({ message: "Failed to finalize roster" });
    }
  });
  
  // Unfinalize a roster (admin only)
  app.delete("/api/admin/finalize-roster/:year/:month", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);
    
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      await storage.unfinalizeRoster(year, month);
      res.status(200).json({ message: "Roster unfinalized successfully" });
    } catch (err) {
      console.error("Error unfinalizing roster:", err);
      res.status(500).json({ message: "Failed to unfinalize roster" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}