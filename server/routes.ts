import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { insertAvailabilitySchema, deadlineDaySchema, User, insertVerseSchema } from "@shared/schema";
import nodemailer from "nodemailer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
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
      const user = await storage.createUser({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        pin: "000000",
        isAdmin: false,
        firstLogin: true
      });
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to create member" });
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
      
      // Use the selected month or default to current month
      const selectedMonth = month ? new Date(month) : new Date();
      const allUsers = await storage.getAllUsers();
      
      // Group users by service date
      const rosterData: { [key: string]: User[] } = {};
      
      // Process availability records
      for (const record of availabilityRecords) {
        // Only include available users
        if (!record.isAvailable) continue;
        
        const date = record.serviceDate.toString();
        if (!rosterData[date]) {
          rosterData[date] = [];
        }
        
        // Find the corresponding user
        const user = allUsers.find(u => u.id === record.userId);
        if (user) {
          rosterData[date].push(user);
        }
      }

      // Filter availability records for the selected month
      const filteredRosterData: { [key: string]: User[] } = {};
      const selectedMonthStr = selectedMonth.getMonth();
      const selectedYearStr = selectedMonth.getFullYear();
      
      // Filter out service dates that don't match the selected month
      Object.entries(rosterData).forEach(([dateStr, users]) => {
        const date = new Date(dateStr);
        if (date.getMonth() === selectedMonthStr && date.getFullYear() === selectedYearStr) {
          filteredRosterData[dateStr] = users;
        }
      });
      
      // Get a random verse for the PDF
      const verse = await storage.getRandomVerse('serving');
      
      // Create the PDF document with our data
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

  const httpServer = createServer(app);
  return httpServer;
}