import {
  type User,
  type Tool,
  type Referral,
  type PayoutRequest,
  type SessionLog,
  type InsertTool,
  users,
  tools,
  referrals,
  payoutRequests,
  sessionLogs,
  passwordResetTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByLicenseKey(licenseKey: string): Promise<User | undefined>;
  getUserByWelcomeToken(token: string): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(email: string, passwordHash: string, referredBy?: string): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  getTools(): Promise<Tool[]>;
  getToolById(id: string): Promise<Tool | undefined>;
  createTool(data: InsertTool): Promise<Tool>;
  updateTool(id: string, data: Partial<Tool>): Promise<Tool | undefined>;

  createReferral(referrerId: string, referredUserId: string, commission?: number): Promise<Referral>;
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getReferralByReferred(referredUserId: string): Promise<Referral | undefined>;
  getActiveReferralsByReferrer(referrerId: string): Promise<Referral[]>;

  createPayoutRequest(userId: string, amount: number, bsb: string, accountNumber: string, accountName: string): Promise<PayoutRequest>;
  getPayoutsByUser(userId: string): Promise<PayoutRequest[]>;
  getAllPayouts(): Promise<(PayoutRequest & { userEmail: string })[]>;
  updatePayoutStatus(id: string, status: string): Promise<PayoutRequest | undefined>;

  createSessionLog(userId: string, toolId: string, ipAddress?: string): Promise<SessionLog>;
  getRecentSessionLogs(limit: number): Promise<(SessionLog & { userEmail: string; toolName: string })[]>;

  getAdminStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    totalTools: number;
    pendingPayouts: number;
  }>;

  getAffiliateStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    pendingPayouts: number;
  }>;

  deleteUser(id: string): Promise<boolean>;
  getReferralsByUser(userId: string): Promise<Referral[]>;
  updateReferralCommission(referrerId: string, referredUserId: string, commission: number): Promise<void>;

  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ id: string; userId: string; token: string; expiresAt: Date; used: boolean } | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByLicenseKey(licenseKey: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.licenseKey, licenseKey));
    return user;
  }

  async getUserByWelcomeToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.welcomeToken, token));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(email: string, passwordHash: string, referredBy?: string): Promise<User> {
    const referralCode = randomBytes(6).toString("hex");
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, referralCode, referredBy: referredBy || null })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getTools(): Promise<Tool[]> {
    return db.select().from(tools);
  }

  async getToolById(id: string): Promise<Tool | undefined> {
    const [tool] = await db.select().from(tools).where(eq(tools.id, id));
    return tool;
  }

  async createTool(data: InsertTool): Promise<Tool> {
    const [tool] = await db.insert(tools).values(data).returning();
    return tool;
  }

  async updateTool(id: string, data: Partial<Tool>): Promise<Tool | undefined> {
    const [tool] = await db
      .update(tools)
      .set(data)
      .where(eq(tools.id, id))
      .returning();
    return tool;
  }

  async createReferral(referrerId: string, referredUserId: string, commission = 25): Promise<Referral> {
    const [ref] = await db
      .insert(referrals)
      .values({ referrerId, referredUserId, commissionPercentage: commission })
      .returning();
    return ref;
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId));
  }

  async getReferralByReferred(referredUserId: string): Promise<Referral | undefined> {
    const [ref] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, referredUserId));
    return ref;
  }

  async getActiveReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referrerId, referrerId), eq(referrals.active, true)));
  }

  async createPayoutRequest(userId: string, amount: number, bsb: string, accountNumber: string, accountName: string): Promise<PayoutRequest> {
    const [payout] = await db
      .insert(payoutRequests)
      .values({ userId, amount, bsb, accountNumber, accountName })
      .returning();
    return payout;
  }

  async getPayoutsByUser(userId: string): Promise<PayoutRequest[]> {
    return db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.userId, userId))
      .orderBy(desc(payoutRequests.createdAt));
  }

  async getAllPayouts(): Promise<(PayoutRequest & { userEmail: string })[]> {
    const results = await db
      .select({
        id: payoutRequests.id,
        userId: payoutRequests.userId,
        amount: payoutRequests.amount,
        bsb: payoutRequests.bsb,
        accountNumber: payoutRequests.accountNumber,
        accountName: payoutRequests.accountName,
        status: payoutRequests.status,
        createdAt: payoutRequests.createdAt,
        userEmail: users.email,
      })
      .from(payoutRequests)
      .leftJoin(users, eq(payoutRequests.userId, users.id))
      .orderBy(desc(payoutRequests.createdAt));
    return results.map((r) => ({
      ...r,
      userEmail: r.userEmail || "Unknown",
    }));
  }

  async updatePayoutStatus(id: string, status: string): Promise<PayoutRequest | undefined> {
    const [payout] = await db
      .update(payoutRequests)
      .set({ status: status as any })
      .where(eq(payoutRequests.id, id))
      .returning();
    return payout;
  }

  async createSessionLog(userId: string, toolId: string, ipAddress?: string): Promise<SessionLog> {
    const [log] = await db
      .insert(sessionLogs)
      .values({ userId, toolId, ipAddress: ipAddress || null })
      .returning();
    return log;
  }

  async getRecentSessionLogs(limit: number): Promise<(SessionLog & { userEmail: string; toolName: string })[]> {
    const results = await db
      .select({
        id: sessionLogs.id,
        userId: sessionLogs.userId,
        toolId: sessionLogs.toolId,
        ipAddress: sessionLogs.ipAddress,
        createdAt: sessionLogs.createdAt,
        userEmail: users.email,
        toolName: tools.name,
      })
      .from(sessionLogs)
      .leftJoin(users, eq(sessionLogs.userId, users.id))
      .leftJoin(tools, eq(sessionLogs.toolId, tools.id))
      .orderBy(desc(sessionLogs.createdAt))
      .limit(limit);
    return results.map((r) => ({
      ...r,
      userEmail: r.userEmail || "Unknown",
      toolName: r.toolName || "Unknown",
    }));
  }

  async getAdminStats() {
    const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const [activeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.subscriptionStatus, "active"));
    const [toolCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tools);
    const [payoutCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payoutRequests)
      .where(eq(payoutRequests.status, "pending"));

    return {
      totalUsers: userCount.count,
      activeSubscriptions: activeCount.count,
      totalTools: toolCount.count,
      pendingPayouts: payoutCount.count,
    };
  }

  async getAffiliateStats(userId: string) {
    const allRefs = await this.getReferralsByReferrer(userId);
    const activeRefs = allRefs.filter((r) => r.active);
    const pendingPayouts = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(payoutRequests)
      .where(and(eq(payoutRequests.userId, userId), eq(payoutRequests.status, "pending")));

    return {
      totalReferrals: allRefs.length,
      activeReferrals: activeRefs.length,
      pendingPayouts: pendingPayouts[0].count,
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(referrals).where(eq(referrals.referrerId, id));
    await db.delete(referrals).where(eq(referrals.referredUserId, id));
    await db.delete(payoutRequests).where(eq(payoutRequests.userId, id));
    await db.delete(sessionLogs).where(eq(sessionLogs.userId, id));
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getReferralsByUser(userId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, userId));
  }

  async updateReferralCommission(referrerId: string, referredUserId: string, commission: number): Promise<void> {
    await db.update(referrals)
      .set({ commissionPercentage: commission })
      .where(and(eq(referrals.referrerId, referrerId), eq(referrals.referredUserId, referredUserId)));
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async getPasswordResetToken(token: string) {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, id));
  }
}

export const storage = new DatabaseStorage();
