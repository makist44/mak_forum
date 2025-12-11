import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum("role", ["admin", "moderator", "member", "new_user"]);
export const inviteStatusEnum = pgEnum("invite_status", ["pending", "approved", "rejected"]);
export const moderationActionEnum = pgEnum("moderation_action", ["delete_post", "delete_thread", "ban_user", "warn_user", "lock_thread", "pin_thread", "unpin_thread", "approve_invite", "reject_invite"]);

// Users table
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default("new_user"),
  avatar: text("avatar"),
  bio: text("bio"),
  postCount: integer("post_count").notNull().default(0),
  threadCount: integer("thread_count").notNull().default(0),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  hasPrivateAccess: boolean("has_private_access").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActive: timestamp("last_active").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  icon: varchar("icon", { length: 50 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPrivate: boolean("is_private").notNull().default(false),
  threadCount: integer("thread_count").notNull().default(0),
  postCount: integer("post_count").notNull().default(0),
});

// Threads table
export const threads = pgTable("threads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  viewCount: integer("view_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  lastReplyAt: timestamp("last_reply_at"),
  lastReplyById: integer("last_reply_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  content: text("content").notNull(),
  threadId: integer("thread_id").notNull().references(() => threads.id, { onDelete: "cascade" }),
  authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Private invites table
export const privateInvites = pgTable("private_invites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Moderation logs table
export const moderationLogs = pgTable("moderation_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  moderatorId: integer("moderator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
  action: moderationActionEnum("action").notNull(),
  reason: text("reason"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Banned IPs table
export const bannedIps = pgTable("banned_ips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  reason: text("reason"),
  bannedById: integer("banned_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: text("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  threads: many(threads),
  posts: many(posts),
  privateInvites: many(privateInvites),
  moderationLogs: many(moderationLogs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  threads: many(threads),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  category: one(categories, {
    fields: [threads.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [threads.authorId],
    references: [users.id],
  }),
  lastReplyBy: one(users, {
    fields: [threads.lastReplyById],
    references: [users.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  thread: one(threads, {
    fields: [posts.threadId],
    references: [threads.id],
  }),
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export const privateInvitesRelations = relations(privateInvites, ({ one }) => ({
  user: one(users, {
    fields: [privateInvites.userId],
    references: [users.id],
  }),
  reviewedBy: one(users, {
    fields: [privateInvites.reviewedById],
    references: [users.id],
  }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  moderator: one(users, {
    fields: [moderationLogs.moderatorId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [moderationLogs.targetUserId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  postCount: true,
  threadCount: true,
  isBanned: true,
  banReason: true,
  hasPrivateAccess: true,
  createdAt: true,
  lastActive: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  threadCount: true,
  postCount: true,
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  isPinned: true,
  isLocked: true,
  viewCount: true,
  replyCount: true,
  lastReplyAt: true,
  lastReplyById: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  isEdited: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPrivateInviteSchema = createInsertSchema(privateInvites).omit({
  id: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  createdAt: true,
});

export const insertModerationLogSchema = createInsertSchema(moderationLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBannedIpSchema = createInsertSchema(bannedIps).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères").max(50),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Thread = typeof threads.$inferSelect;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PrivateInvite = typeof privateInvites.$inferSelect;
export type InsertPrivateInvite = z.infer<typeof insertPrivateInviteSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;
export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type BannedIp = typeof bannedIps.$inferSelect;
export type InsertBannedIp = z.infer<typeof insertBannedIpSchema>;
export type Session = typeof sessions.$inferSelect;

// Extended types with relations
export type ThreadWithRelations = Thread & {
  author: User;
  category: Category;
  lastReplyBy?: User | null;
};

export type PostWithRelations = Post & {
  author: User;
};

export type PrivateInviteWithRelations = PrivateInvite & {
  user: User;
  reviewedBy?: User | null;
};

export type ModerationLogWithRelations = ModerationLog & {
  moderator: User;
  targetUser?: User | null;
};
