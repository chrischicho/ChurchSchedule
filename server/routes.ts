import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { insertAvailabilitySchema, deadlineDaySchema } from "@shared/schema";

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
          return res.status(403).json({ 
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

  const httpServer = createServer(app);
  return httpServer;
}