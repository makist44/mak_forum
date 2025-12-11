import { 
  users, categories, threads, posts, privateInvites, moderationLogs, bannedIps,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Thread, type InsertThread, type ThreadWithRelations,
  type Post, type InsertPost, type PostWithRelations,
  type PrivateInvite, type InsertPrivateInvite, type PrivateInviteWithRelations,
  type ModerationLog, type InsertModerationLog, type ModerationLogWithRelations,
  type BannedIp, type InsertBannedIp,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategoryStats(id: number): Promise<void>;
  
  // Threads
  getThread(id: number): Promise<ThreadWithRelations | undefined>;
  getThreadsByCategory(categorySlug: string): Promise<ThreadWithRelations[]>;
  getRecentThreads(limit?: number): Promise<ThreadWithRelations[]>;
  getTrendingThreads(limit?: number): Promise<ThreadWithRelations[]>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThread(id: number, data: Partial<Thread>): Promise<Thread | undefined>;
  deleteThread(id: number): Promise<void>;
  incrementViewCount(id: number): Promise<void>;
  
  // Posts
  getPostsByThread(threadId: number): Promise<PostWithRelations[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: number, data: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: number): Promise<void>;
  
  // Private Invites
  getPrivateInviteByUser(userId: number): Promise<PrivateInvite | undefined>;
  getPendingInvites(): Promise<PrivateInviteWithRelations[]>;
  createPrivateInvite(invite: InsertPrivateInvite): Promise<PrivateInvite>;
  updatePrivateInvite(id: number, status: "approved" | "rejected", reviewerId: number): Promise<PrivateInvite | undefined>;
  
  // Moderation
  getModerationLogs(limit?: number): Promise<ModerationLogWithRelations[]>;
  createModerationLog(log: InsertModerationLog): Promise<ModerationLog>;
  
  // Banned IPs
  getBannedIp(ip: string): Promise<BannedIp | undefined>;
  createBannedIp(bannedIp: InsertBannedIp): Promise<BannedIp>;
  
  // Stats
  getForumStats(): Promise<{ totalUsers: number; totalThreads: number; totalPosts: number; onlineUsers: number }>;
  getAdminStats(): Promise<{ totalUsers: number; totalThreads: number; totalPosts: number; pendingInvites: number }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories).values(category).returning();
    return result;
  }

  async updateCategoryStats(id: number): Promise<void> {
    const threadResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(threads)
      .where(eq(threads.categoryId, id));
    
    const postResult = await db.select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .innerJoin(threads, eq(posts.threadId, threads.id))
      .where(eq(threads.categoryId, id));
    
    await db.update(categories).set({
      threadCount: threadResult[0]?.count || 0,
      postCount: postResult[0]?.count || 0,
    }).where(eq(categories.id, id));
  }

  // Threads
  async getThread(id: number): Promise<ThreadWithRelations | undefined> {
    const result = await db.query.threads.findFirst({
      where: eq(threads.id, id),
      with: {
        author: true,
        category: true,
        lastReplyBy: true,
      },
    });
    return result as ThreadWithRelations | undefined;
  }

  async getThreadsByCategory(categorySlug: string): Promise<ThreadWithRelations[]> {
    const category = await this.getCategoryBySlug(categorySlug);
    if (!category) return [];
    
    const result = await db.query.threads.findMany({
      where: eq(threads.categoryId, category.id),
      with: {
        author: true,
        category: true,
        lastReplyBy: true,
      },
      orderBy: [desc(threads.isPinned), desc(threads.lastReplyAt), desc(threads.createdAt)],
    });
    return result as ThreadWithRelations[];
  }

  async getRecentThreads(limit = 10): Promise<ThreadWithRelations[]> {
    const result = await db.query.threads.findMany({
      with: {
        author: true,
        category: true,
        lastReplyBy: true,
      },
      orderBy: [desc(threads.createdAt)],
      limit,
    });
    return result as ThreadWithRelations[];
  }

  async getTrendingThreads(limit = 5): Promise<ThreadWithRelations[]> {
    const result = await db.query.threads.findMany({
      with: {
        author: true,
        category: true,
        lastReplyBy: true,
      },
      orderBy: [desc(threads.replyCount), desc(threads.viewCount)],
      limit,
    });
    return result as ThreadWithRelations[];
  }

  async createThread(thread: InsertThread): Promise<Thread> {
    const [result] = await db.insert(threads).values(thread).returning();
    await db.update(users).set({ 
      threadCount: sql`${users.threadCount} + 1` 
    }).where(eq(users.id, thread.authorId));
    await this.updateCategoryStats(thread.categoryId);
    return result;
  }

  async updateThread(id: number, data: Partial<Thread>): Promise<Thread | undefined> {
    const [result] = await db.update(threads).set({ ...data, updatedAt: new Date() }).where(eq(threads.id, id)).returning();
    return result || undefined;
  }

  async deleteThread(id: number): Promise<void> {
    const thread = await this.getThread(id);
    if (thread) {
      await db.delete(threads).where(eq(threads.id, id));
      await this.updateCategoryStats(thread.categoryId);
    }
  }

  async incrementViewCount(id: number): Promise<void> {
    await db.update(threads).set({ 
      viewCount: sql`${threads.viewCount} + 1` 
    }).where(eq(threads.id, id));
  }

  // Posts
  async getPostsByThread(threadId: number): Promise<PostWithRelations[]> {
    const result = await db.query.posts.findMany({
      where: eq(posts.threadId, threadId),
      with: {
        author: true,
      },
      orderBy: [posts.createdAt],
    });
    return result as PostWithRelations[];
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [result] = await db.insert(posts).values(post).returning();
    
    await db.update(threads).set({
      replyCount: sql`${threads.replyCount} + 1`,
      lastReplyAt: new Date(),
      lastReplyById: post.authorId,
    }).where(eq(threads.id, post.threadId));
    
    await db.update(users).set({
      postCount: sql`${users.postCount} + 1`,
    }).where(eq(users.id, post.authorId));
    
    const thread = await db.select().from(threads).where(eq(threads.id, post.threadId));
    if (thread[0]) {
      await this.updateCategoryStats(thread[0].categoryId);
    }
    
    return result;
  }

  async updatePost(id: number, data: Partial<Post>): Promise<Post | undefined> {
    const [result] = await db.update(posts).set({ ...data, isEdited: true, updatedAt: new Date() }).where(eq(posts.id, id)).returning();
    return result || undefined;
  }

  async deletePost(id: number): Promise<void> {
    const post = await db.select().from(posts).where(eq(posts.id, id));
    if (post[0]) {
      await db.delete(posts).where(eq(posts.id, id));
      await db.update(threads).set({
        replyCount: sql`${threads.replyCount} - 1`,
      }).where(eq(threads.id, post[0].threadId));
      
      const thread = await db.select().from(threads).where(eq(threads.id, post[0].threadId));
      if (thread[0]) {
        await this.updateCategoryStats(thread[0].categoryId);
      }
    }
  }

  // Private Invites
  async getPrivateInviteByUser(userId: number): Promise<PrivateInvite | undefined> {
    const [invite] = await db.select().from(privateInvites).where(eq(privateInvites.userId, userId)).orderBy(desc(privateInvites.createdAt));
    return invite || undefined;
  }

  async getPendingInvites(): Promise<PrivateInviteWithRelations[]> {
    const result = await db.query.privateInvites.findMany({
      where: eq(privateInvites.status, "pending"),
      with: {
        user: true,
        reviewedBy: true,
      },
      orderBy: [desc(privateInvites.createdAt)],
    });
    return result as PrivateInviteWithRelations[];
  }

  async createPrivateInvite(invite: InsertPrivateInvite): Promise<PrivateInvite> {
    const [result] = await db.insert(privateInvites).values(invite).returning();
    return result;
  }

  async updatePrivateInvite(id: number, status: "approved" | "rejected", reviewerId: number): Promise<PrivateInvite | undefined> {
    const [result] = await db.update(privateInvites).set({
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    }).where(eq(privateInvites.id, id)).returning();
    
    if (result && status === "approved") {
      await db.update(users).set({ hasPrivateAccess: true }).where(eq(users.id, result.userId));
    }
    
    return result || undefined;
  }

  // Moderation
  async getModerationLogs(limit = 50): Promise<ModerationLogWithRelations[]> {
    const result = await db.query.moderationLogs.findMany({
      with: {
        moderator: true,
        targetUser: true,
      },
      orderBy: [desc(moderationLogs.createdAt)],
      limit,
    });
    return result as ModerationLogWithRelations[];
  }

  async createModerationLog(log: InsertModerationLog): Promise<ModerationLog> {
    const [result] = await db.insert(moderationLogs).values(log).returning();
    return result;
  }

  // Banned IPs
  async getBannedIp(ip: string): Promise<BannedIp | undefined> {
    const [result] = await db.select().from(bannedIps).where(eq(bannedIps.ipAddress, ip));
    return result || undefined;
  }

  async createBannedIp(bannedIp: InsertBannedIp): Promise<BannedIp> {
    const [result] = await db.insert(bannedIps).values(bannedIp).returning();
    return result;
  }

  // Stats
  async getForumStats(): Promise<{ totalUsers: number; totalThreads: number; totalPosts: number; onlineUsers: number }> {
    const usersCount = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const threadsCount = await db.select({ count: sql<number>`count(*)::int` }).from(threads);
    const postsCount = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
    
    return {
      totalUsers: usersCount[0]?.count || 0,
      totalThreads: threadsCount[0]?.count || 0,
      totalPosts: postsCount[0]?.count || 0,
      onlineUsers: Math.floor(Math.random() * 10) + 1, // Placeholder for real online tracking
    };
  }

  async getAdminStats(): Promise<{ totalUsers: number; totalThreads: number; totalPosts: number; pendingInvites: number }> {
    const usersCount = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const threadsCount = await db.select({ count: sql<number>`count(*)::int` }).from(threads);
    const postsCount = await db.select({ count: sql<number>`count(*)::int` }).from(posts);
    const invitesCount = await db.select({ count: sql<number>`count(*)::int` }).from(privateInvites).where(eq(privateInvites.status, "pending"));
    
    return {
      totalUsers: usersCount[0]?.count || 0,
      totalThreads: threadsCount[0]?.count || 0,
      totalPosts: postsCount[0]?.count || 0,
      pendingInvites: invitesCount[0]?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
