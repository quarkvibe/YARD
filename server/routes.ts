import type { Express } from "express";
import { createServer, type Server } from "node:http";
import * as path from "node:path";
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

  // Serve terms of use page
  app.get("/terms", (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "server", "templates", "terms.html"));
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.GMAIL_USER,
        replyTo: email,
        subject: `YARD Support: Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        html: `
          <h2>New Support Message</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
