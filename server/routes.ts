import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { insertAvailabilitySchema } from "@shared/schema";

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
  app.post("/api/admin/members", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const user = await storage.createUser({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        pin: "000000",
        isAdmin: false
      });
      res.status(201).json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.post("/api/admin/reset-pin/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const user = await storage.updateUserPin(parseInt(req.params.id), "000000");
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: "Failed to reset PIN" });
    }
  });

  // Add these routes after the existing admin routes
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


  // Availability routes
  app.post("/api/availability", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertAvailabilitySchema.parse(req.body);
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