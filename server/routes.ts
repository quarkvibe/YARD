import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as path from "node:path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve privacy policy page
  app.get("/privacy", (_req, res) => {
    res.sendFile(
      path.resolve(process.cwd(), "server", "templates", "privacy.html"),
    );
  });

  // Serve support page
  app.get("/support", (_req, res) => {
    res.sendFile(
      path.resolve(process.cwd(), "server", "templates", "support.html"),
    );
  });

  const httpServer = createServer(app);

  return httpServer;
}
