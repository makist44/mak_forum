import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeft,
} from "lucide-react";
import type { Category, ThreadWithRelations } from "@shared/schema";

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

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: category, isLoading: categoryLoading } = useQuery<Category>({
    queryKey: ["/api/categories", slug],
  });

  const { data: threads, isLoading: threadsLoading } = useQuery<ThreadWithRelations[]>({
    queryKey: ["/api/categories", slug, "threads"],
  });

  if (categoryLoading) {
    return (
      <ForumLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ForumLayout>
    );
  }

  if (!category) {
    return (
      <ForumLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Catégorie introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Cette catégorie n'existe pas ou vous n'avez pas les permissions nécessaires.
          </p>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
      </ForumLayout>
    );
  }

  const canPost = user && (user.role !== "new_user" || !category.isPrivate);

  return (
    <ForumLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-category-title">
                {category.name}
                {category.isPrivate && (
                  <Lock className="h-5 w-5 text-primary" />
                )}
              </h1>
            </div>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{category.threadCount} discussions</span>
              <span>{category.postCount} messages</span>
            </div>
          </div>
          {canPost && (
            <Button asChild data-testid="button-new-thread">
              <Link href={`/nouveau-sujet?category=${slug}`}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau sujet
              </Link>
            </Button>
          )}
        </div>

        {threadsLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : threads?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-2">Aucune discussion</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Soyez le premier à créer une discussion dans cette catégorie !
              </p>
              {canPost && (
                <Button asChild>
                  <Link href={`/nouveau-sujet?category=${slug}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau sujet
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {threads?.map((thread) => (
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
      </div>
    </ForumLayout>
  );
}
