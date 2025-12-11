import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import bcrypt from "bcrypt";
import { z } from "zod";
import { loginSchema, registerSchema, insertThreadSchema, insertPostSchema, insertPrivateInviteSchema } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import rateLimit from "express-rate-limit";
import { csrfProtection, getCsrfToken } from "./csrf";

const PgSession = connectPgSimple(session);

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: "Trop de tentatives, veuillez réessayer plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { message: "Trop de requêtes, veuillez réessayer plus tard" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware: require auth
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentification requise" });
  }
  next();
}

// Middleware: require role
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentification requise" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Permissions insuffisantes" });
    }
    next();
  };
}

// Middleware: check banned
async function checkBanned(req: Request, res: Response, next: NextFunction) {
  if (req.session.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user?.isBanned) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Votre compte a été banni" });
    }
  }
  next();
}

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
      },
    })
  );

  // Apply rate limiting
  app.use("/api/auth", authLimiter);
  app.use("/api", generalLimiter);
  app.use(checkBanned);

  // CSRF protection middleware for all API routes
  // This generates token for GET requests and validates for POST/PATCH/DELETE
  app.use("/api", csrfProtection);
  
  // CSRF token endpoint (GET request so csrfProtection won't block it)
  app.get("/api/csrf-token", getCsrfToken);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }
      
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Ce nom d'utilisateur est déjà pris" });
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 12);
      const user = await storage.createUser({
        username: sanitizeInput(data.username),
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: "new_user",
      });
      
      req.session.userId = user.id;
      
      const { password: _, ...safeUser } = user;
      res.status(201).json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ message: "Une erreur est survenue" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email.toLowerCase());
      if (!user) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ message: "Votre compte a été banni" });
      }
      
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      
      await storage.updateUser(user.id, { lastActive: new Date() });
      req.session.userId = user.id;
      
      const { password: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Une erreur est survenue" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erreur lors de la déconnexion" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Déconnexion réussie" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Utilisateur introuvable" });
    }
    
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des catégories" });
    }
  });

  app.get("/api/categories/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Catégorie introuvable" });
      }
      
      // Check private access
      if (category.isPrivate) {
        if (!req.session.userId) {
          return res.status(403).json({ message: "Accès réservé aux membres" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user?.hasPrivateAccess) {
          return res.status(403).json({ message: "Accès non autorisé à cette section" });
        }
      }
      
      res.json(category);
    } catch (error) {
      console.error("Get category error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la catégorie" });
    }
  });

  app.get("/api/categories/:slug/threads", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Catégorie introuvable" });
      }
      
      // Check private access
      if (category.isPrivate) {
        if (!req.session.userId) {
          return res.status(403).json({ message: "Accès réservé aux membres" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user?.hasPrivateAccess) {
          return res.status(403).json({ message: "Accès non autorisé à cette section" });
        }
      }
      
      const threads = await storage.getThreadsByCategory(req.params.slug);
      res.json(threads);
    } catch (error) {
      console.error("Get category threads error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des discussions" });
    }
  });

  // Threads routes
  app.get("/api/threads/recent", async (req, res) => {
    try {
      const threads = await storage.getRecentThreads(10);
      // Filter out private threads for non-authorized users
      const user = req.session.userId ? await storage.getUser(req.session.userId) : null;
      const filteredThreads = threads.filter(t => !t.category?.isPrivate || user?.hasPrivateAccess);
      res.json(filteredThreads);
    } catch (error) {
      console.error("Get recent threads error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des discussions" });
    }
  });

  app.get("/api/threads/trending", async (req, res) => {
    try {
      const threads = await storage.getTrendingThreads(5);
      const user = req.session.userId ? await storage.getUser(req.session.userId) : null;
      const filteredThreads = threads.filter(t => !t.category?.isPrivate || user?.hasPrivateAccess);
      res.json(filteredThreads);
    } catch (error) {
      console.error("Get trending threads error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des discussions" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Discussion introuvable" });
      }
      
      // Check private access
      if (thread.category?.isPrivate) {
        if (!req.session.userId) {
          return res.status(403).json({ message: "Accès réservé aux membres" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user?.hasPrivateAccess) {
          return res.status(403).json({ message: "Accès non autorisé" });
        }
      }
      
      await storage.incrementViewCount(threadId);
      res.json(thread);
    } catch (error) {
      console.error("Get thread error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la discussion" });
    }
  });

  app.post("/api/threads", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role === "new_user") {
        return res.status(403).json({ message: "Les nouveaux utilisateurs ne peuvent pas créer de discussions" });
      }
      
      const { title, content, categoryId } = req.body;
      
      const category = await storage.getCategoryBySlug(
        (await storage.getCategories()).find(c => c.id === categoryId)?.slug || ""
      ) || (await storage.getCategories()).find(c => c.id === categoryId);
      
      if (!category) {
        return res.status(400).json({ message: "Catégorie invalide" });
      }
      
      if (category.isPrivate && !user.hasPrivateAccess) {
        return res.status(403).json({ message: "Accès non autorisé à cette section" });
      }
      
      const thread = await storage.createThread({
        title: sanitizeInput(title),
        content: sanitizeInput(content),
        categoryId,
        authorId: user.id,
      });
      
      res.status(201).json(thread);
    } catch (error) {
      console.error("Create thread error:", error);
      res.status(500).json({ message: "Erreur lors de la création de la discussion" });
    }
  });

  // Posts routes
  app.get("/api/threads/:id/posts", async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Discussion introuvable" });
      }
      
      // Check private access
      if (thread.category?.isPrivate) {
        if (!req.session.userId) {
          return res.status(403).json({ message: "Accès réservé aux membres" });
        }
        const user = await storage.getUser(req.session.userId);
        if (!user?.hasPrivateAccess) {
          return res.status(403).json({ message: "Accès non autorisé" });
        }
      }
      
      const posts = await storage.getPostsByThread(threadId);
      res.json(posts);
    } catch (error) {
      console.error("Get posts error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des messages" });
    }
  });

  app.post("/api/threads/:id/posts", requireAuth, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user || user.role === "new_user") {
        return res.status(403).json({ message: "Les nouveaux utilisateurs ne peuvent pas répondre" });
      }
      
      const thread = await storage.getThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Discussion introuvable" });
      }
      
      if (thread.isLocked) {
        return res.status(403).json({ message: "Cette discussion est verrouillée" });
      }
      
      if (thread.category?.isPrivate && !user.hasPrivateAccess) {
        return res.status(403).json({ message: "Accès non autorisé" });
      }
      
      const { content } = req.body;
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "Le contenu est requis" });
      }
      
      const post = await storage.createPost({
        content: sanitizeInput(content),
        threadId,
        authorId: user.id,
      });
      
      res.status(201).json(post);
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ message: "Erreur lors de la création du message" });
    }
  });

  app.delete("/api/posts/:id", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
      
      await storage.deletePost(postId);
      await storage.createModerationLog({
        moderatorId: req.session.userId!,
        action: "delete_post",
        details: `Post ID: ${postId}`,
      });
      
      res.json({ message: "Message supprimé" });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du message" });
    }
  });

  // Private invites
  app.get("/api/private-invites/my-request", requireAuth, async (req, res) => {
    try {
      const invite = await storage.getPrivateInviteByUser(req.session.userId!);
      res.json(invite || null);
    } catch (error) {
      console.error("Get invite error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la demande" });
    }
  });

  app.post("/api/private-invites", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Utilisateur introuvable" });
      }
      
      if (user.hasPrivateAccess) {
        return res.status(400).json({ message: "Vous avez déjà accès" });
      }
      
      const existing = await storage.getPrivateInviteByUser(user.id);
      if (existing && existing.status === "pending") {
        return res.status(400).json({ message: "Vous avez déjà une demande en cours" });
      }
      
      const { reason } = req.body;
      if (!reason || reason.trim().length < 50) {
        return res.status(400).json({ message: "La raison doit contenir au moins 50 caractères" });
      }
      
      const invite = await storage.createPrivateInvite({
        userId: user.id,
        reason: sanitizeInput(reason),
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ message: "Erreur lors de la création de la demande" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
    }
  });

  app.get("/api/admin/users", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const safeUsers = users.map(({ password: _, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
    }
  });

  app.get("/api/admin/pending-invites", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const invites = await storage.getPendingInvites();
      res.json(invites);
    } catch (error) {
      console.error("Get pending invites error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des demandes" });
    }
  });

  app.patch("/api/admin/private-invites/:id", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const inviteId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Statut invalide" });
      }
      
      const invite = await storage.updatePrivateInvite(inviteId, status, req.session.userId!);
      if (!invite) {
        return res.status(404).json({ message: "Demande introuvable" });
      }
      
      await storage.createModerationLog({
        moderatorId: req.session.userId!,
        targetUserId: invite.userId,
        action: status === "approved" ? "approve_invite" : "reject_invite",
      });
      
      res.json(invite);
    } catch (error) {
      console.error("Update invite error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour de la demande" });
    }
  });

  app.patch("/api/admin/users/:id/role", requireRole("admin"), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!["new_user", "member", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ message: "Rôle invalide" });
      }
      
      const user = await storage.updateUser(userId, { role });
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }
      
      await storage.createModerationLog({
        moderatorId: req.session.userId!,
        targetUserId: userId,
        action: "warn_user",
        details: `Rôle changé en: ${role}`,
      });
      
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du rôle" });
    }
  });

  app.post("/api/admin/users/:id/ban", requireRole("admin"), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const user = await storage.updateUser(userId, { isBanned: true, banReason: reason });
      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }
      
      await storage.createModerationLog({
        moderatorId: req.session.userId!,
        targetUserId: userId,
        action: "ban_user",
        reason,
      });
      
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ message: "Erreur lors du bannissement" });
    }
  });

  app.get("/api/admin/moderation-logs", requireRole("admin", "moderator"), async (req, res) => {
    try {
      const logs = await storage.getModerationLogs();
      res.json(logs);
    } catch (error) {
      console.error("Get moderation logs error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des logs" });
    }
  });

  // Stats route
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getForumStats();
      res.json(stats);
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
    }
  });

  return httpServer;
}
