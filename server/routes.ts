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
  updateProfileSchema,
  updateMemberNameSchema
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

      // Get roster data
      const availabilityRecords = await storage.getAvailability();
      console.log("Total availability records:", availabilityRecords.length);
      console.log("Available records:", availabilityRecords.filter(r => r.isAvailable).length);
      
      // Use the selected month or default to current month
      const selectedMonth = month ? new Date(month) : new Date();
      console.log("Selected month:", selectedMonth.toISOString());
      
      const allUsers = await storage.getAllUsers();
      console.log("Total users:", allUsers.length);
      
      // Group users by service date
      const rosterData: { [key: string]: User[] } = {};
      
      // Process availability records
      for (const record of availabilityRecords) {
        // Only include available users
        if (!record.isAvailable) continue;
        
        // Make sure we're working with proper Date objects
        const serviceDate = new Date(record.serviceDate);
        
        // Use ISO string for consistent key format
        const isoDateStr = serviceDate.toISOString();
        
        if (!rosterData[isoDateStr]) {
          rosterData[isoDateStr] = [];
        }
        
        // Find the corresponding user
        const user = allUsers.find(u => u.id === record.userId);
        if (user) {
          rosterData[isoDateStr].push(user);
        }
      }
      
      console.log("Service dates with available users:", Object.keys(rosterData).length);
      
      // Filter availability records for the selected month
      const filteredRosterData: { [key: string]: User[] } = {};
      const selectedMonthStr = selectedMonth.getMonth();
      const selectedYearStr = selectedMonth.getFullYear();
      
      console.log("Filtering for month:", selectedMonthStr, "year:", selectedYearStr);
      
      // Filter out service dates that don't match the selected month
      Object.entries(rosterData).forEach(([isoDateStr, users]) => {
        const date = new Date(isoDateStr);
        console.log("Checking date:", format(date, "yyyy-MM-dd"), "Month:", date.getMonth(), "Year:", date.getFullYear());
        
        if (date.getMonth() === selectedMonthStr && date.getFullYear() === selectedYearStr) {
          // Keep using ISO string format consistently
          filteredRosterData[isoDateStr] = users;
          console.log("Added date", format(date, "yyyy-MM-dd"), "with", users.length, "users");
        }
      });
      
      // Get a random verse for the PDF
      const verse = await storage.getRandomVerse('serving');
      
      // Create the PDF document with our data
      console.log("Final filteredRosterData:", JSON.stringify(filteredRosterData));
      
      const rosterPDFElement = createElement(RosterPDF, { 
        month: selectedMonth, 
        rosterData: filteredRosterData,
        viewType: viewType || "card",
        verse: verse
      });
      
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

  const httpServer = createServer(app);
  return httpServer;
}