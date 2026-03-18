import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { tools, users } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    const [existingAdmin] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    if (existingAdmin.count === 0) {
      console.log("Seeding admin user...");
      const adminHash = await bcrypt.hash("admin123!", 12);
      const adminUser = await storage.createUser("admin@onestack.pro", adminHash);
      await storage.updateUser(adminUser.id, {
        role: "admin",
        subscriptionStatus: "active",
        licenseKey: "ADMN-ADMN-ADMN-ADMN",
      });
    } else {
      const adminUser = await storage.getUserByEmail("admin@onestack.pro");
      if (adminUser) {
        const updates: any = {};
        if (adminUser.twoFactorEnabled) {
          console.log("Resetting admin 2FA...");
          updates.twoFactorEnabled = false;
          updates.totpSecret = null;
        }
        if (!adminUser.licenseKey) {
          console.log("Generating admin license key...");
          updates.licenseKey = "ADMN-ADMN-ADMN-ADMN";
        }
        if (Object.keys(updates).length > 0) {
          await db.update(users).set(updates).where(sql`email = 'admin@onestack.pro'`);
        }
      }
    }

    const [existingTools] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tools);

    if (existingTools.count > 0) {
      console.log("Tools already exist, updating logos and access URLs...");
      const toolUpdates: Record<string, { logoUrl: string; accessUrl: string }> = {
        "Perplexity": { logoUrl: "/logos/perplexity.avif", accessUrl: "https://www.perplexity.ai" },
        "ChatGPT": { logoUrl: "/logos/chatgpt.png", accessUrl: "https://chat.openai.com" },
        "Freepik": { logoUrl: "/logos/freepik.webp", accessUrl: "https://www.freepik.com" },
        "ElevenLabs": { logoUrl: "/logos/elevenlabs.png", accessUrl: "https://elevenlabs.io" },
        "Claude": { logoUrl: "/logos/claude.png", accessUrl: "https://claude.ai" },
        "Kalodata": { logoUrl: "/logos/kalodata.png", accessUrl: "https://www.kalodata.com" },
        "GetHooked": { logoUrl: "/logos/gethooked.jpg", accessUrl: "https://www.gethookd.ai" },
        "Canva": { logoUrl: "/logos/canva.png", accessUrl: "https://www.canva.com" },
        "Storyblocks": { logoUrl: "/logos/storyblocks.png", accessUrl: "https://www.storyblocks.com" },
        "SpyFu": { logoUrl: "/logos/spyfu.jpeg", accessUrl: "https://www.spyfu.com" },
        "Higgsfield": { logoUrl: "/logos/higgsfield.jpeg", accessUrl: "https://www.higgsfield.ai" },
        "Grammarly": { logoUrl: "/logos/grammarly.png", accessUrl: "https://www.grammarly.com" },
        "Jasper": { logoUrl: "/logos/jasper.png", accessUrl: "https://www.jasper.ai" },
        "Ahrefs": { logoUrl: "/logos/ahrefs.png", accessUrl: "https://ahrefs.com" },
        "Midjourney": { logoUrl: "/logos/midjourney.png", accessUrl: "https://www.midjourney.com" },
        "SEMrush": { logoUrl: "/logos/semrush.png", accessUrl: "https://www.semrush.com" },
      };
      for (const [name, data] of Object.entries(toolUpdates)) {
        const pattern = `%${name}%`;
        await db.update(tools).set({ logoUrl: data.logoUrl, accessUrl: data.accessUrl }).where(sql`name ILIKE ${pattern}`);
      }
      return;
    }

    console.log("Seeding tools...");

    const seedTools = [
      {
        name: "Perplexity",
        description: "AI-powered search engine that provides direct, cited answers to complex questions with real-time web access.",
        icon: "PX",
        category: "AI Assistants",
        logoUrl: "/logos/perplexity.avif",
        accessUrl: "https://www.perplexity.ai",
        active: true,
      },
      {
        name: "ChatGPT",
        description: "Advanced AI conversational assistant with GPT-4 capabilities for content creation, coding, and analysis.",
        icon: "GP",
        category: "AI Assistants",
        logoUrl: "/logos/chatgpt.png",
        accessUrl: "https://chat.openai.com",
        active: true,
      },
      {
        name: "Freepik",
        description: "Premium design resource platform with millions of high-quality vectors, photos, PSD files, and icons.",
        icon: "FP",
        category: "Design",
        logoUrl: "/logos/freepik.webp",
        accessUrl: "https://www.freepik.com",
        active: true,
      },
      {
        name: "ElevenLabs",
        description: "State-of-the-art AI voice synthesis platform for creating ultra-realistic voiceovers and audio content.",
        icon: "EL",
        category: "AI Audio",
        logoUrl: "/logos/elevenlabs.png",
        accessUrl: "https://elevenlabs.io",
        active: true,
      },
      {
        name: "Claude",
        description: "Anthropic's advanced AI assistant for research, writing, coding, and complex reasoning tasks.",
        icon: "CL",
        category: "AI Assistants",
        logoUrl: "/logos/claude.png",
        accessUrl: "https://claude.ai",
        active: true,
      },
      {
        name: "Kalodata",
        description: "TikTok Shop analytics platform for tracking trending products, creators, and sales data in real-time.",
        icon: "KD",
        category: "Analytics",
        logoUrl: "/logos/kalodata.png",
        accessUrl: "https://www.kalodata.com",
        active: true,
      },
      {
        name: "GetHooked",
        description: "AI-powered hook generator for creating viral social media content and attention-grabbing video intros.",
        icon: "GH",
        category: "Content Creation",
        logoUrl: "/logos/gethooked.jpg",
        accessUrl: "https://www.gethookd.ai",
        active: true,
      },
      {
        name: "Canva",
        description: "Professional design platform with premium templates, stock photos, brand kit features, and AI design tools.",
        icon: "CV",
        category: "Design",
        logoUrl: "/logos/canva.png",
        accessUrl: "https://www.canva.com",
        active: true,
      },
      {
        name: "Storyblocks",
        description: "Unlimited stock media library with royalty-free video, audio, and image assets for content creators.",
        icon: "SB",
        category: "Content Creation",
        logoUrl: "/logos/storyblocks.png",
        accessUrl: "https://www.storyblocks.com",
        active: true,
      },
      {
        name: "SpyFu",
        description: "Competitive intelligence tool for SEO and PPC research, keyword tracking, and competitor analysis.",
        icon: "SF",
        category: "Marketing",
        logoUrl: "/logos/spyfu.jpeg",
        accessUrl: "https://www.spyfu.com",
        active: true,
      },
      {
        name: "Higgsfield",
        description: "AI video creation platform for generating professional social media videos with advanced AI effects.",
        icon: "HF",
        category: "AI Video",
        logoUrl: "/logos/higgsfield.jpeg",
        accessUrl: "https://www.higgsfield.ai",
        active: true,
      },
    ];

    for (const tool of seedTools) {
      await storage.createTool(tool);
    }

    console.log("Database seeded successfully.");
  } catch (err) {
    console.error("Seed error:", err);
  }
}
