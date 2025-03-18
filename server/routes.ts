import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { ZodError } from "zod";
import { insertAvailabilitySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Admin routes
  app.post("/api/admin/members", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.sendStatus(403);
    }

    try {
      const user = await storage.createUser({
        ...req.body,
        pin: "000000"
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
