import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "inactive", "cancelled", "suspended"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "approved", "paid"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  licenseKey: text("license_key").unique(),
  role: roleEnum("role").notNull().default("user"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("inactive"),
  discordId: text("discord_id"),
  discordUsername: text("discord_username"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  earningsBalance: integer("earnings_balance").notNull().default(0),
  currentSessionId: text("current_session_id"),
  welcomeToken: text("welcome_token").unique(),
  affiliateEnabled: boolean("affiliate_enabled").notNull().default(true),
  commissionPercentage: integer("commission_percentage").notNull().default(25),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  totpSecret: text("totp_secret"),
  preferredBrowser: text("preferred_browser").default("dicloak"),
  dicloakMemberId: text("dicloak_member_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: text("category").notNull().default("General"),
  logoUrl: text("logo_url"),
  accessUrl: text("access_url"),
  toolUsername: text("tool_username"),
  toolPassword: text("tool_password"),
  totpSecret: text("totp_secret"),
  active: boolean("active").notNull().default(true),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(),
  referredUserId: varchar("referred_user_id").notNull(),
  commissionPercentage: integer("commission_percentage").notNull().default(25),
  active: boolean("active").notNull().default(true),
});

export const payoutRequests = pgTable("payout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  bsb: text("bsb").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessionLogs = pgTable("session_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  toolId: varchar("tool_id").notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  licenseKey: true,
  role: true,
  subscriptionStatus: true,
  discordId: true,
  discordUsername: true,
  referralCode: true,
  referredBy: true,
  earningsBalance: true,
  currentSessionId: true,
  welcomeToken: true,
  affiliateEnabled: true,
  commissionPercentage: true,
  twoFactorEnabled: true,
  totpSecret: true,
  preferredBrowser: true,
  createdAt: true,
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  licenseKey: z.string().min(1, "License key is required"),
});

export const legacyLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequests).omit({
  id: true,
  userId: true,
  status: true,
  createdAt: true,
}).extend({
  amount: z.number().int().positive("Amount must be positive"),
  bsb: z.string().min(1, "BSB is required").regex(/^\d{3}-?\d{3}$/, "BSB must be 6 digits (e.g. 123-456)"),
  accountNumber: z.string().min(1, "Account number is required").regex(/^\d{4,10}$/, "Account number must be 4-10 digits"),
  accountName: z.string().min(1, "Account name is required").max(100, "Account name too long"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type SessionLog = typeof sessionLogs.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;
