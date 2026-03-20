import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Transporter (Placeholder for Resend or Gmail)
  // User needs to provide EMAIL_SERVICE_USER and EMAIL_SERVICE_PASS or RESEND_API_KEY
  const transporter = nodemailer.createTransport({
    service: "gmail", // Or use a custom SMTP
    auth: {
      user: process.env.EMAIL_SERVICE_USER,
      pass: process.env.EMAIL_SERVICE_PASS,
    },
  });

  // API Route to send verification code
  app.post("/api/auth/send-code", async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    try {
      if (!process.env.EMAIL_SERVICE_USER || !process.env.EMAIL_SERVICE_PASS) {
        console.error("Email credentials missing in environment variables.");
        return res.status(500).json({ 
          error: "Email service not configured. Please add EMAIL_SERVICE_USER and EMAIL_SERVICE_PASS to your secrets.",
          code: "MISSING_CREDENTIALS"
        });
      }

      const mailOptions = {
        from: `"Goldistrip" <${process.env.EMAIL_SERVICE_USER}>`,
        to: email,
        subject: "[Goldistrip] Verification Code",
        text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #FFB602; text-align: center;">Goldistrip Verification</h2>
            <p>Hello,</p>
            <p>Thank you for signing up for Goldistrip. Please enter the following 6-digit verification code to complete your registration:</p>
            <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error sending email:", error);
      
      let errorMessage = "Failed to send email. Please check server logs.";
      let errorCode = "EMAIL_SEND_FAILED";

      if (error.message && error.message.includes('534-5.7.9')) {
        errorMessage = "Gmail App Password required. Please generate a 16-character App Password in your Google Account settings and use it as EMAIL_SERVICE_PASS.";
        errorCode = "APP_PASSWORD_REQUIRED";
      } else if (error.code === 'EAUTH') {
        errorMessage = "Email authentication failed. Please check your EMAIL_SERVICE_USER and EMAIL_SERVICE_PASS.";
        errorCode = "AUTH_FAILED";
      }

      res.status(500).json({ 
        error: errorMessage,
        code: errorCode,
        details: error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
