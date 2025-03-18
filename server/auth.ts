import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser, updatePinSchema } from "@shared/schema";
import { ZodError } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'id',
      passwordField: 'pin'
    }, async (id, pin, done) => {
      try {
        const user = await storage.getUser(parseInt(id));
        if (!user || user.pin !== pin) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  app.post("/api/change-pin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { currentPin, newPin } = updatePinSchema.parse(req.body);
      const user = await storage.getUser(req.user.id);
      
      if (!user || user.pin !== currentPin) {
        return res.status(400).json({ message: "Current PIN is incorrect" });
      }

      const updatedUser = await storage.updateUserPin(user.id, newPin);
      res.json(updatedUser);
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ message: "PIN must be exactly 6 digits" });
      } else {
        res.status(500).json({ message: "Failed to update PIN" });
      }
    }
  });
}
