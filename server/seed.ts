import { db } from "./db";
import { users, categories } from "@shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  try {
    // Check if already seeded
    const existingCategories = await db.select().from(categories);
    if (existingCategories.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12);
    await db.insert(users).values({
      username: "admin",
      email: "admin@arraw-tllelli.com",
      password: adminPassword,
      role: "admin",
      hasPrivateAccess: true,
    });

    // Create moderator user
    const modPassword = await bcrypt.hash("moderator123", 12);
    await db.insert(users).values({
      username: "moderateur",
      email: "mod@arraw-tllelli.com",
      password: modPassword,
      role: "moderator",
      hasPrivateAccess: true,
    });

    // Create categories
    const categoryData = [
      { name: "Discussion Générale", slug: "discussion-generale", description: "Discussions générales sur divers sujets", icon: "MessageSquare", sortOrder: 1 },
      { name: "Politique", slug: "politique", description: "Débats et discussions politiques", icon: "Landmark", sortOrder: 2 },
      { name: "Histoire", slug: "histoire", description: "Histoire et patrimoine Amazigh", icon: "BookOpen", sortOrder: 3 },
      { name: "Hors-Sujet", slug: "hors-sujet", description: "Discussions hors-sujet et divertissement", icon: "Coffee", sortOrder: 4 },
      { name: "Religion & Spiritualité", slug: "religion-spiritualite", description: "Discussions sur la religion et la spiritualité", icon: "Heart", sortOrder: 5 },
      { name: "Livres & Littérature", slug: "livres-litterature", description: "Recommandations de livres et discussions littéraires", icon: "Library", sortOrder: 6 },
      { name: "Technologie", slug: "technologie", description: "Nouvelles technologies et informatique", icon: "Cpu", sortOrder: 7 },
      { name: "Mèmes", slug: "memes", description: "Humour et mèmes", icon: "Laugh", sortOrder: 8 },
      { name: "Musique", slug: "musique", description: "Musique Amazigh et internationale", icon: "Music", sortOrder: 9 },
      { name: "Makist", slug: "makist", description: "Section privée réservée aux membres approuvés", icon: "Lock", sortOrder: 10, isPrivate: true },
    ];

    for (const cat of categoryData) {
      await db.insert(categories).values(cat);
    }

    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
