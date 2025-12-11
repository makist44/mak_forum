import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  MessageSquare, 
  Eye, 
  Pin, 
  Lock, 
  Plus,
  ChevronRight,
  Landmark,
  BookOpen,
  Coffee,
  Heart,
  Library,
  Cpu,
  Laugh,
  Music,
} from "lucide-react";
import type { Category, ThreadWithRelations } from "@shared/schema";

const categoryIcons: Record<string, React.ReactNode> = {
  "discussion-generale": <MessageSquare className="h-5 w-5" />,
  "politique": <Landmark className="h-5 w-5" />,
  "histoire": <BookOpen className="h-5 w-5" />,
  "hors-sujet": <Coffee className="h-5 w-5" />,
  "religion-spiritualite": <Heart className="h-5 w-5" />,
  "livres-litterature": <Library className="h-5 w-5" />,
  "technologie": <Cpu className="h-5 w-5" />,
  "memes": <Laugh className="h-5 w-5" />,
  "musique": <Music className="h-5 w-5" />,
  "makist": <Lock className="h-5 w-5" />,
};

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge variant="destructive" className="text-xs">Admin</Badge>;
    case "moderator":
      return <Badge className="text-xs bg-blue-500 text-white">Mod</Badge>;
    case "member":
      return null;
    default:
      return <Badge variant="secondary" className="text-xs">Nouveau</Badge>;
  }
}

export default function HomePage() {
  const { user } = useAuth();

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: recentThreads, isLoading: threadsLoading } = useQuery<ThreadWithRelations[]>({
    queryKey: ["/api/threads/recent"],
  });

  const visibleCategories = categories?.filter(
    (cat) => !cat.isPrivate || (user && user.hasPrivateAccess)
  );

  return (
    <ForumLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Bienvenue sur Arraw Tllelli
            </h1>
            <p className="text-muted-foreground mt-1">
              Forum de la communauté Amazigh
            </p>
          </div>
          {user && (
            <Button asChild data-testid="button-new-thread">
              <Link href="/nouveau-sujet">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau sujet
              </Link>
            </Button>
          )}
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-4">Catégories</h2>
          {categoriesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(9)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCategories?.map((category) => (
                <Link
                  key={category.id}
                  href={`/categorie/${category.slug}`}
                  data-testid={`card-category-${category.slug}`}
                >
                  <Card className="hover-elevate h-full transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-md ${category.isPrivate ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                          {categoryIcons[category.slug] || <MessageSquare className="h-5 w-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{category.name}</h3>
                            {category.isPrivate && (
                              <Lock className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {category.threadCount} discussions • {category.postCount} messages
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Discussions Récentes</h2>
            <Link href="/discussions" className="text-sm text-primary hover:underline" data-testid="link-all-threads">
              Voir tout
            </Link>
          </div>
          
          {threadsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentThreads?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium mb-2">Aucune discussion</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Soyez le premier à créer une discussion !
                </p>
                {user && (
                  <Button asChild>
                    <Link href="/nouveau-sujet">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau sujet
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentThreads?.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/discussion/${thread.id}`}
                  data-testid={`card-thread-${thread.id}`}
                >
                  <Card className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {thread.author?.username?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {thread.isPinned && (
                              <Pin className="h-3 w-3 text-primary shrink-0" />
                            )}
                            {thread.isLocked && (
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <h3 className="font-medium line-clamp-1">{thread.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="font-medium text-foreground">
                              {thread.author?.username}
                            </span>
                            {getRoleBadge(thread.author?.role || "new_user")}
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {thread.category?.name}
                            </Badge>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(new Date(thread.createdAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{thread.replyCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{thread.viewCount}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </ForumLayout>
  );
}
