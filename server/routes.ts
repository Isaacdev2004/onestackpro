import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { registerSchema, loginSchema, legacyLoginSchema } from "@shared/schema";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { createDicloakMember, disableDicloakMember, enableDicloakMember } from "./dicloak";

const updateUserSchema = z.object({
  subscriptionStatus: z.enum(["active", "inactive", "cancelled", "suspended"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
  affiliateEnabled: z.boolean().optional(),
  commissionPercentage: z.number().int().min(25).max(40).optional(),
  referralCode: z.string().min(3, "Referral code must be at least 3 characters").max(30, "Referral code too long").regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, dashes, and underscores allowed").optional(),
  reset2fa: z.boolean().optional(),
});

const createToolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Icon is required"),
  category: z.string().min(1, "Category is required").default("General"),
  logoUrl: z.string().nullable().optional(),
  accessUrl: z.string().nullable().optional(),
  toolUsername: z.string().nullable().optional(),
  toolPassword: z.string().nullable().optional(),
  totpSecret: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

const updateToolSchema = z.object({
  active: z.boolean().optional(),
  toolUsername: z.string().nullable().optional(),
  toolPassword: z.string().nullable().optional(),
  totpSecret: z.string().nullable().optional(),
  accessUrl: z.string().nullable().optional(),
});

const payoutRequestSchema = z.object({
  amount: z.number().int().positive("Amount must be positive"),
  bsb: z.string().min(1, "BSB is required").regex(/^\d{3}-?\d{3}$/, "BSB must be 6 digits (e.g. 123-456)"),
  accountNumber: z.string().min(1, "Account number is required").regex(/^\d{4,10}$/, "Account number must be 4-10 digits"),
  accountName: z.string().min(1, "Account name is required").max(100, "Account name too long"),
});

const updatePayoutSchema = z.object({
  status: z.enum(["approved", "paid"]),
});

const PgStore = connectPgSimple(session);

async function ensureSessionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire"
    ON "session" ("expire")
  `);
}

function getSafeNextPath(nextParam?: string): string {
  if (!nextParam) return "/dashboard";
  if (!nextParam.startsWith("/") || nextParam.startsWith("//")) return "/dashboard";
  return nextParam;
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    sessionId?: string;
    discordOAuthState?: string;
    discordRedirectUri?: string;
    discordAuthMode?: string;
    pending2faUserId?: string;
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many webhook requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (user.currentSessionId && user.currentSessionId !== req.sessionID) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Session expired. You have been logged in from another location." });
  }

  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUserById(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function sanitizeUser(user: any) {
  const { passwordHash, currentSessionId, totpSecret, ...safe } = user;
  return safe;
}

function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = "";
    for (let i = 0; i < 4; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join("-");
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";

function getPublicBaseUrl(req: Request): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  if (host) {
    return `${protocol}://${host}`;
  }

  const configuredBaseUrl = process.env.PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, "");
  }

  return "https://onestack.pro";
}

function getDiscordRedirectUri(req: Request): string {
  return `${getPublicBaseUrl(req)}/api/discord/callback`;
}

function getDiscordAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function exchangeDiscordCode(code: string, redirectUri: string): Promise<{ id: string; username: string; discriminator: string; avatar: string | null; email?: string } | null> {
  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) return null;
    return userRes.json();
  } catch {
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionCookieDomain = process.env.SESSION_COOKIE_DOMAIN;

  await ensureSessionTable();

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({
        pool: pool as any,
        createTableIfMissing: false,
      }),
      secret: process.env.SESSION_SECRET || "onestack-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {}),
      },
    })
  );

  app.use("/api/", apiLimiter);

  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const { email, password } = parsed.data;
      const refCode = req.body.ref;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser(email, passwordHash, refCode || undefined);

      if (refCode) {
        const allUsers = await storage.getAllUsers();
        const referrer = allUsers.find((u) => u.referralCode === refCode);
        if (referrer && referrer.affiliateEnabled) {
          await storage.createReferral(referrer.id, user.id, referrer.commissionPercentage);
        }
      }

      req.session.userId = user.id;
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      res.json({ user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req: Request, res: Response) => {
    try {
      const { licenseKey, email, password } = req.body;

      let user;
      if (licenseKey) {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
        }
        user = await storage.getUserByLicenseKey(parsed.data.licenseKey.trim().toUpperCase());
        if (!user) {
          return res.status(401).json({ message: "Invalid license key" });
        }
      } else if (email && password) {
        const parsed = legacyLoginSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
        }
        user = await storage.getUserByEmail(parsed.data.email);
        if (!user) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
      } else {
        return res.status(400).json({ message: "License key is required" });
      }

      if (user.subscriptionStatus === "suspended") {
        return res.status(403).json({ message: "Your account has been suspended. Please contact support." });
      }

      req.session.userId = user.id;
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      res.json({ user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/2fa-verify", authLimiter, async (req: Request, res: Response) => {
    try {
      const pendingUserId = req.session.pending2faUserId;
      if (!pendingUserId) {
        return res.status(400).json({ message: "No pending 2FA verification" });
      }

      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const user = await storage.getUserById(pendingUserId);
      if (!user || !user.totpSecret) {
        return res.status(401).json({ message: "Invalid session" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "OneStack.pro",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      delete req.session.pending2faUserId;
      req.session.userId = user.id;
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      res.json({ user: sanitizeUser(user) });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const userId = req.session.userId;
    if (userId) {
      await storage.updateUser(userId, { currentSessionId: null });
    }
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/welcome", async (req: Request, res: Response) => {
    try {
      const token = req.query.session as string;
      const shouldRedirect = req.query.redirect === "1";
      const nextPath = getSafeNextPath(req.query.next as string | undefined);
      if (!token) {
        return res.status(400).json({ message: "Missing session token" });
      }
      const user = await storage.getUserByWelcomeToken(token);
      if (!user) {
        return res.status(401).json({ message: "Invalid or expired session token" });
      }
      await storage.updateUser(user.id, { welcomeToken: null, currentSessionId: req.sessionID });
      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Failed to persist welcome login session:", err);
          if (shouldRedirect) {
            return res.redirect("/auth?discord=error&reason=server_error");
          }
          return res.status(500).json({ message: "Failed to persist session" });
        }
        if (shouldRedirect) {
          return res.redirect(nextPath);
        }
        return res.json({ user: sanitizeUser(user) });
      });
      return;
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      res.json({ ok: true, message: "If an account with that email exists, a password reset link has been sent." });

      if (!user) return;

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      try {
        const { sendPasswordResetEmail } = await import("./email");
        await sendPasswordResetEmail(email, resetLink);
        console.log(`[Password Reset] Email sent to ${email}`);
      } catch (emailErr: any) {
        console.error("[Password Reset] Email sending failed:", emailErr?.message || emailErr);
        console.log(`[Password Reset] Fallback link for ${email}: ${resetLink}`);
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Reset token is required" });
      }
      if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      if (resetToken.used) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUser(resetToken.userId, { passwordHash });
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ ok: true, message: "Password has been reset successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/auth/change-password", authLimiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || typeof currentPassword !== "string") {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Password verification failed" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(user.id, { passwordHash });

      res.json({ ok: true, message: "Password changed successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json(sanitizeUser(user));
  });

  app.get("/api/auth/license-key", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not found" });
    res.json({ licenseKey: user.licenseKey || null });
  });

  app.patch("/api/auth/preferred-browser", requireAuth, async (req: Request, res: Response) => {
    try {
      const { preferredBrowser } = req.body;
      if (!preferredBrowser || !["dicloak", "ginsbrowser"].includes(preferredBrowser)) {
        return res.status(400).json({ message: "Invalid browser. Choose 'dicloak' or 'ginsbrowser'." });
      }
      await storage.updateUser(req.session.userId!, { preferredBrowser });
      res.json({ ok: true, preferredBrowser });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.get("/api/discord/authorize", (req: Request, res: Response) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return res.status(503).json({ message: "Discord integration is not configured." });
    }

    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    req.session.discordOAuthState = state;
    req.session.discordAuthMode = req.session.userId ? "link" : "login";

    const redirectUri = getDiscordRedirectUri(req);
    req.session.discordRedirectUri = redirectUri;
    const url = getDiscordAuthUrl(state, redirectUri);
    if (req.query.redirect === "1") {
      return res.redirect(url);
    }
    return res.json({ url });
  });

  app.get("/api/discord/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;

      if (!code || typeof code !== "string") {
        return res.redirect("/auth?discord=error&reason=no_code");
      }

      const authMode = req.session.discordAuthMode || "login";
      const savedState = req.session.discordOAuthState;
      const hasValidState = typeof state === "string" && !!savedState && state === savedState;
      if (authMode === "link" && !hasValidState) {
        return res.redirect("/auth?discord=error&reason=invalid_state");
      }

      if (!hasValidState) {
        console.warn("Discord OAuth callback state mismatch during login flow; continuing to avoid false session expiry.");
      }

      delete req.session.discordOAuthState;
      delete req.session.discordAuthMode;

      const redirectUri = req.session.discordRedirectUri || getDiscordRedirectUri(req);
      delete req.session.discordRedirectUri;

      const discordUser = await exchangeDiscordCode(code, redirectUri);
      if (!discordUser) {
        return res.redirect("/auth?discord=error&reason=exchange_failed");
      }

      const discordUsername = discordUser.discriminator !== "0"
        ? `${discordUser.username}#${discordUser.discriminator}`
        : discordUser.username;

      if (authMode === "link" && req.session.userId) {
        const existingUserWithDiscord = await storage.getUserByDiscordId(discordUser.id);
        if (existingUserWithDiscord && existingUserWithDiscord.id !== req.session.userId) {
          return res.redirect("/dashboard?discord=error&reason=already_linked");
        }
        await storage.updateUser(req.session.userId, {
          discordId: discordUser.id,
          discordUsername: discordUsername,
        });
        return res.redirect("/dashboard?discord=linked");
      }

      let user = await storage.getUserByDiscordId(discordUser.id);

      if (!user && discordUser.email) {
        const emailUser = await storage.getUserByEmail(discordUser.email);
        if (emailUser) {
          await storage.updateUser(emailUser.id, {
            discordId: discordUser.id,
            discordUsername: discordUsername,
          });
          user = { ...emailUser, discordId: discordUser.id, discordUsername };
        }
      }

      if (!user) {
        const email = discordUser.email || `${discordUser.id}@discord.user`;
        const existingFallbackUser = await storage.getUserByEmail(email);
        if (existingFallbackUser) {
          await storage.updateUser(existingFallbackUser.id, {
            discordId: discordUser.id,
            discordUsername,
          });
          user = { ...existingFallbackUser, discordId: discordUser.id, discordUsername };
        } else {
          const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
          try {
            user = await storage.createUser(email, passwordHash);
          } catch (createErr: any) {
            // Handle retry/race cases where the email was created by a concurrent request.
            const racedUser = await storage.getUserByEmail(email);
            if (!racedUser) {
              throw createErr;
            }
            await storage.updateUser(racedUser.id, {
              discordId: discordUser.id,
              discordUsername,
            });
            user = { ...racedUser, discordId: discordUser.id, discordUsername };
          }
        }
        if (!user.licenseKey) {
          const licenseKey = generateLicenseKey();
          await storage.updateUser(user.id, {
            discordId: discordUser.id,
            discordUsername,
            licenseKey,
          });
          user = (await storage.getUserById(user.id))!;
        }
      }

      req.session.userId = user.id;
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      const sessionToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { welcomeToken: sessionToken, currentSessionId: null });
      const params = new URLSearchParams({
        session: sessionToken,
        redirect: "1",
        next: "/dashboard",
      });
      return res.redirect(`/api/auth/welcome?${params.toString()}`);
      return;
    } catch (err: any) {
      console.error("Discord callback error:", err);
      return res.redirect("/auth?discord=error&reason=server_error");
    }
  });

  app.post("/api/discord/unlink", requireAuth, async (req: Request, res: Response) => {
    await storage.updateUser(req.session.userId!, { discordId: null, discordUsername: null });
    res.json({ ok: true });
  });

  app.post("/api/2fa/setup", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not found" });
      if (user.twoFactorEnabled) {
        return res.status(400).json({ message: "2FA is already enabled" });
      }

      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: "OneStack.pro",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });

      const otpauthUrl = totp.toString();
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

      await storage.updateUser(user.id, { totpSecret: secret.base32 });

      res.json({
        secret: secret.base32,
        qrCode: qrCodeDataUrl,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/2fa/confirm", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user || !user.totpSecret) {
        return res.status(400).json({ message: "2FA setup not initiated" });
      }

      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Verification code is required" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "OneStack.pro",
        label: user.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return res.status(401).json({ message: "Invalid verification code. Please try again." });
      }

      await storage.updateUser(user.id, { twoFactorEnabled: true });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/2fa/disable", requireAuth, async (_req: Request, res: Response) => {
    res.status(403).json({ message: "Two-factor authentication is mandatory and cannot be disabled." });
  });

  app.get("/api/credentials", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not authenticated" });

      const dicloakEmail = process.env.DICLOAK_EMAIL || null;
      const dicloakPassword = process.env.DICLOAK_PASSWORD || null;
      const hasTotp = !!process.env.DICLOAK_TOTP_SECRET;

      res.json({
        licenseKey: user.licenseKey,
        email: dicloakEmail,
        password: dicloakPassword,
        hasTotp,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.get("/api/tools", async (req: Request, res: Response) => {
    const toolList = await storage.getTools();
    if (!req.session.userId) {
      res.json(toolList.map(t => ({
        id: t.id, name: t.name, description: t.description, icon: t.icon,
        category: t.category, logoUrl: t.logoUrl, active: t.active,
      })));
    } else {
      res.json(toolList);
    }
  });

  app.post("/api/tools/:id/launch", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user || user.subscriptionStatus !== "active") {
      return res.status(403).json({ message: "Active subscription required" });
    }

    const tool = await storage.getToolById(req.params.id as string);
    if (!tool || !tool.active) {
      return res.status(404).json({ message: "Tool not found or disabled" });
    }

    const ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "";
    await storage.createSessionLog(user.id, tool.id, ip);

    let totpCode: string | null = null;
    if (tool.totpSecret) {
      try {
        const totp = new OTPAuth.TOTP({
          issuer: tool.name,
          label: tool.toolUsername || tool.name,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(tool.totpSecret),
        });
        totpCode = totp.generate();
      } catch {
        totpCode = null;
      }
    }

    res.json({
      message: `Session started for ${tool.name}`,
      toolId: tool.id,
      accessUrl: tool.accessUrl || null,
      preferredBrowser: user.preferredBrowser || "dicloak",
      toolUsername: tool.toolUsername || null,
      toolPassword: tool.toolPassword || null,
      totpCode,
    });
  });

  app.post("/api/tools/:id/totp", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user || user.subscriptionStatus !== "active") {
      return res.status(403).json({ message: "Active subscription required" });
    }

    const tool = await storage.getToolById(req.params.id as string);
    if (!tool || !tool.active || !tool.totpSecret) {
      return res.status(404).json({ message: "No 2FA configured for this tool" });
    }

    try {
      const totp = new OTPAuth.TOTP({
        issuer: tool.name,
        label: tool.toolUsername || tool.name,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(tool.totpSecret),
      });
      res.json({ totpCode: totp.generate() });
    } catch {
      res.status(500).json({ message: "Failed to generate 2FA code" });
    }
  });

  app.post("/api/credentials/totp", requireAuth, async (req: Request, res: Response) => {
    try {
      const dicloakTotpSecret = process.env.DICLOAK_TOTP_SECRET;
      if (!dicloakTotpSecret) {
        return res.status(404).json({ message: "No 2FA configured" });
      }

      const totp = new OTPAuth.TOTP({
        issuer: "DICloak",
        label: process.env.DICLOAK_EMAIL || "OneStack",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(dicloakTotpSecret),
      });
      res.json({ totpCode: totp.generate() });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate 2FA code" });
    }
  });

  app.get("/api/affiliates/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = await storage.getAffiliateStats(req.session.userId!);
    res.json(stats);
  });

  app.get("/api/affiliates/payouts", requireAuth, async (req: Request, res: Response) => {
    const payouts = await storage.getPayoutsByUser(req.session.userId!);
    res.json(payouts);
  });

  app.post("/api/affiliates/payout", requireAuth, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Not found" });

    const parsed = payoutRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }

    if (parsed.data.amount > user.earningsBalance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    await storage.createPayoutRequest(user.id, parsed.data.amount, parsed.data.bsb, parsed.data.accountNumber, parsed.data.accountName);
    await storage.updateUser(user.id, { earningsBalance: user.earningsBalance - parsed.data.amount });

    res.json({ ok: true });
  });

  app.post("/api/webhooks/whop", webhookLimiter, async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
      if (webhookSecret) {
        const rawBody = (req as any).rawBody;
        if (!rawBody) {
          return res.status(400).json({ message: "Could not verify request body" });
        }

        const sigHeader =
          (req.headers["whop-signature"] as string) ||
          (req.headers["svix-signature"] as string) ||
          (req.headers["webhook-signature"] as string);

        if (!sigHeader) {
          return res.status(401).json({ message: "Missing webhook signature" });
        }

        let verified = false;
        try {
          const signatures = sigHeader.split(" ");
          for (const sig of signatures) {
            const parts = sig.split(",");
            const signatureValue = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            const cleanSig = signatureValue.replace(/^v\d+=/, "");

            const expectedHex = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
            const expectedBase64 = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("base64");

            if (cleanSig === expectedHex || cleanSig === expectedBase64) {
              verified = true;
              break;
            }

            const timestampHeader =
              (req.headers["svix-timestamp"] as string) ||
              (req.headers["webhook-timestamp"] as string);
            if (timestampHeader) {
              const msgId =
                (req.headers["svix-id"] as string) ||
                (req.headers["webhook-id"] as string) || "";
              const signedContent = `${msgId}.${timestampHeader}.${rawBody}`;
              const expectedSigned = crypto.createHmac("sha256", webhookSecret).update(signedContent).digest("base64");
              if (cleanSig === expectedSigned) {
                verified = true;
                break;
              }
            }
          }
        } catch {
          return res.status(401).json({ message: "Signature verification error" });
        }

        if (!verified) {
          return res.status(401).json({ message: "Invalid webhook signature" });
        }
      }

      const { action, data } = req.body;
      if (!action || !data) {
        return res.status(400).json({ message: "Missing action or data" });
      }

      const email = data.user?.email || data.email;
      if (!email) {
        return res.status(200).json({ ok: true, skipped: "no email in payload" });
      }

      let user = await storage.getUserByEmail(email);

      if (action === "membership.went_valid" || action === "payment.succeeded") {
        if (!user) {
          const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 12);
          user = await storage.createUser(email, passwordHash);
        }

        let licenseKey = user.licenseKey;
        if (!licenseKey) {
          licenseKey = generateLicenseKey();
          let attempts = 0;
          while (await storage.getUserByLicenseKey(licenseKey) && attempts < 10) {
            licenseKey = generateLicenseKey();
            attempts++;
          }
        }

        const welcomeToken = crypto.randomBytes(32).toString("hex");
        await storage.updateUser(user.id, { subscriptionStatus: "active", licenseKey, welcomeToken });

        try {
          const { sendLicenseKeyEmail } = await import("./email");
          await sendLicenseKeyEmail(email, licenseKey);
          console.log(`[Whop Webhook] License key emailed to ${email}`);
        } catch (emailErr: any) {
          console.error("[Whop Webhook] Email failed:", emailErr?.message);
          console.log(`[Whop Webhook] License key for ${email}: ${licenseKey}`);
        }

        console.log(`[Whop Webhook] Welcome URL: /welcome?session=${welcomeToken}`);

        if (!user.dicloakMemberId) {
          const dicloakResult = await createDicloakMember({
            name: user.discordUsername || email.split("@")[0],
            account: email,
            password: licenseKey,
            remark: `OneStack subscriber: ${email}`,
            days: 30,
          });
          if (dicloakResult.success && dicloakResult.memberId) {
            await storage.updateUser(user.id, { dicloakMemberId: dicloakResult.memberId });
            console.log(`[Whop Webhook] DICloak member created for ${email}: ${dicloakResult.memberId}`);
          }
        } else {
          await enableDicloakMember(user.dicloakMemberId, 30);
          console.log(`[Whop Webhook] DICloak member re-enabled for ${email}`);
        }

        const refCode = data.metadata?.ref || data.affiliate_id;
        if (refCode && !await storage.getReferralByReferred(user.id)) {
          const allUsers = await storage.getAllUsers();
          const referrer = allUsers.find((u) => u.referralCode === refCode);
          if (referrer && referrer.affiliateEnabled) {
            await storage.createReferral(referrer.id, user.id, referrer.commissionPercentage);
          }
        }

        if (action === "payment.succeeded") {
          const referral = await storage.getReferralByReferred(user.id);
          if (referral && referral.active) {
            const priceInCents = data.final_amount || data.amount || 2999;
            const commission = Math.round(priceInCents * (referral.commissionPercentage / 100));
            const referrer = await storage.getUserById(referral.referrerId);
            if (referrer) {
              await storage.updateUser(referrer.id, {
                earningsBalance: referrer.earningsBalance + commission,
              });
            }
          }
        }
      } else if (action === "membership.went_invalid") {
        if (user) {
          await storage.updateUser(user.id, { subscriptionStatus: "cancelled" });
          if (user.dicloakMemberId) {
            await disableDicloakMember(user.dicloakMemberId);
            console.log(`[Whop Webhook] DICloak member disabled for ${email}`);
          }
        }
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Webhook error:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
    const stats = await storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(sanitizeUser));
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }

    const targetId = req.params.id as string;

    if (parsed.data.role && targetId === req.session.userId) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    const updates: any = {};
    if (parsed.data.subscriptionStatus !== undefined) updates.subscriptionStatus = parsed.data.subscriptionStatus;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.affiliateEnabled !== undefined) updates.affiliateEnabled = parsed.data.affiliateEnabled;
    if (parsed.data.commissionPercentage !== undefined) updates.commissionPercentage = parsed.data.commissionPercentage;
    if (parsed.data.referralCode !== undefined) {
      const allUsers = await storage.getAllUsers();
      const existing = allUsers.find((u) => u.referralCode === parsed.data.referralCode && u.id !== targetId);
      if (existing) {
        return res.status(409).json({ message: "That referral code is already taken by another user." });
      }
      updates.referralCode = parsed.data.referralCode;
    }
    if (parsed.data.reset2fa) {
      updates.twoFactorEnabled = false;
      updates.totpSecret = null;
    }

    const user = await storage.updateUser(targetId, updates);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(sanitizeUser(user));
  });

  app.post("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(["user", "admin"]).default("admin"),
        referralCode: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
        generateLicenseKey: z.boolean().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const existing = await storage.getUserByEmail(parsed.data.email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      if (parsed.data.referralCode) {
        const allUsers = await storage.getAllUsers();
        const codeTaken = allUsers.find((u) => u.referralCode === parsed.data.referralCode);
        if (codeTaken) {
          return res.status(409).json({ message: "That referral code is already taken." });
        }
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      const user = await storage.createUser(parsed.data.email, passwordHash);
      const updateData: any = { role: parsed.data.role };
      if (parsed.data.referralCode) {
        updateData.referralCode = parsed.data.referralCode;
      }
      if (parsed.data.generateLicenseKey) {
        let key = generateLicenseKey();
        let attempts = 0;
        while (await storage.getUserByLicenseKey(key) && attempts < 10) {
          key = generateLicenseKey();
          attempts++;
        }
        updateData.licenseKey = key;
      }
      await storage.updateUser(user.id, updateData);
      const updated = await storage.getUserById(user.id);

      res.json(sanitizeUser(updated!));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.post("/api/admin/users/:id/regenerate-key", requireAdmin, async (req: Request, res: Response) => {
    try {
      let key = generateLicenseKey();
      let attempts = 0;
      while (await storage.getUserByLicenseKey(key) && attempts < 10) {
        key = generateLicenseKey();
        attempts++;
      }
      const user = await storage.updateUser(req.params.id as string, { licenseKey: key });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ licenseKey: key });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Server error" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req: Request, res: Response) => {
    const targetId = req.params.id as string;

    if (targetId === req.session.userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const deleted = await storage.deleteUser(targetId);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ ok: true, message: "User deleted successfully" });
  });

  app.post("/api/admin/tools", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = createToolSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const tool = await storage.createTool(parsed.data);
      res.json(tool);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/tools/:id", requireAdmin, async (req: Request, res: Response) => {
    const parsed = updateToolSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const updates: any = {};
    if (parsed.data.active !== undefined) updates.active = parsed.data.active;
    if (parsed.data.toolUsername !== undefined) updates.toolUsername = parsed.data.toolUsername;
    if (parsed.data.toolPassword !== undefined) updates.toolPassword = parsed.data.toolPassword;
    if (parsed.data.totpSecret !== undefined) updates.totpSecret = parsed.data.totpSecret;
    if (parsed.data.accessUrl !== undefined) updates.accessUrl = parsed.data.accessUrl;
    const tool = await storage.updateTool(req.params.id as string, updates);
    if (!tool) return res.status(404).json({ message: "Tool not found" });
    res.json(tool);
  });

  app.get("/api/admin/payouts", requireAdmin, async (_req: Request, res: Response) => {
    const payouts = await storage.getAllPayouts();
    res.json(payouts);
  });

  app.patch("/api/admin/payouts/:id", requireAdmin, async (req: Request, res: Response) => {
    const parsed = updatePayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
    }
    const payout = await storage.updatePayoutStatus(req.params.id as string, parsed.data.status);
    if (!payout) return res.status(404).json({ message: "Payout not found" });
    res.json(payout);
  });

  app.get("/api/admin/sessions", requireAdmin, async (_req: Request, res: Response) => {
    const sessions = await storage.getRecentSessionLogs(50);
    res.json(sessions);
  });

  return httpServer;
}
