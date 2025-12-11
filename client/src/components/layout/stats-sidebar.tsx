import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, FileText, TrendingUp, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ThreadWithRelations } from "@shared/schema";

interface ForumStats {
  totalUsers: number;
  totalThreads: number;
  totalPosts: number;
  onlineUsers: number;
}

interface StatsSidebarProps {
  className?: string;
}

export function StatsSidebar({ className }: StatsSidebarProps) {
  const { data: stats, isLoading: statsLoading } = useQuery<ForumStats>({
    queryKey: ["/api/stats"],
  });

  const { data: trendingThreads, isLoading: trendingLoading } = useQuery<ThreadWithRelations[]>({
    queryKey: ["/api/threads/trending"],
  });

  const { data: recentThreads, isLoading: recentLoading } = useQuery<ThreadWithRelations[]>({
    queryKey: ["/api/threads/recent"],
  });

  return (
    <aside className={className}>
      <ScrollArea className="h-full">
        <div className="space-y-4 p-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Statistiques du Forum
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {statsLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="text-center">
                      <Skeleton className="h-6 w-12 mx-auto mb-1" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-lg font-bold" data-testid="stat-users">
                        {stats?.totalUsers || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Membres</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-lg font-bold" data-testid="stat-threads">
                        {stats?.totalThreads || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Discussions</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-lg font-bold" data-testid="stat-posts">
                        {stats?.totalPosts || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Messages</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-lg font-bold" data-testid="stat-online">
                        {stats?.onlineUsers || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">En ligne</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Discussions Populaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trendingLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : trendingThreads?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune discussion pour le moment
                </p>
              ) : (
                trendingThreads?.slice(0, 5).map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/discussion/${thread.id}`}
                    data-testid={`link-trending-${thread.id}`}
                  >
                    <div className="group hover-elevate rounded-md p-2 -m-2">
                      <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {thread.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {thread.replyCount} réponses
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {thread.viewCount} vues
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />
                Activité Récente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))
              ) : recentThreads?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune activité récente
                </p>
              ) : (
                recentThreads?.slice(0, 5).map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/discussion/${thread.id}`}
                    data-testid={`link-recent-${thread.id}`}
                  >
                    <div className="group hover-elevate rounded-md p-2 -m-2">
                      <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                        {thread.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        par {thread.author?.username} •{" "}
                        {formatDistanceToNow(new Date(thread.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </aside>
  );
}
