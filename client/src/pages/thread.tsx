import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  MessageSquare, 
  Eye, 
  Pin, 
  Lock, 
  ArrowLeft,
  Send,
  MoreVertical,
  Trash2,
  Flag,
  Edit,
  Loader2,
  Reply,
} from "lucide-react";
import type { ThreadWithRelations, PostWithRelations, User } from "@shared/schema";

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge variant="destructive" className="text-xs">Administrateur</Badge>;
    case "moderator":
      return <Badge className="text-xs bg-blue-500 text-white">Modérateur</Badge>;
    case "member":
      return <Badge variant="secondary" className="text-xs">Membre</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Nouveau</Badge>;
  }
}

interface PostCardProps {
  post: PostWithRelations;
  user: User | null;
  threadLocked: boolean;
  onDelete: (id: number) => void;
  isFirst?: boolean;
}

function PostCard({ post, user, threadLocked, onDelete, isFirst }: PostCardProps) {
  const canModerate = user && (user.role === "admin" || user.role === "moderator");
  const isAuthor = user && user.id === post.authorId;

  return (
    <Card className={isFirst ? "" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.author?.username?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{post.author?.username}</span>
                {getRoleBadge(post.author?.role || "new_user")}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                {post.isEdited && " (modifié)"}
              </p>
            </div>
          </div>
          {(canModerate || isAuthor) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-post-menu-${post.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <DropdownMenuItem data-testid={`button-edit-post-${post.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {canModerate && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(post.id)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </CardContent>
      {!threadLocked && user && (
        <CardFooter className="pt-0">
          <Button variant="ghost" size="sm" data-testid={`button-reply-${post.id}`}>
            <Reply className="h-4 w-4 mr-1" />
            Répondre
          </Button>
          <Button variant="ghost" size="sm" data-testid={`button-report-${post.id}`}>
            <Flag className="h-4 w-4 mr-1" />
            Signaler
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [replyContent, setReplyContent] = useState("");

  const { data: thread, isLoading: threadLoading } = useQuery<ThreadWithRelations>({
    queryKey: ["/api/threads", id],
  });

  const { data: posts, isLoading: postsLoading } = useQuery<PostWithRelations[]>({
    queryKey: ["/api/threads", id, "posts"],
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/threads/${id}/posts`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", id, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads", id] });
      setReplyContent("");
      toast({
        title: "Réponse publiée",
        description: "Votre réponse a été publiée avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest("DELETE", `/api/posts/${postId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", id, "posts"] });
      toast({
        title: "Message supprimé",
        description: "Le message a été supprimé.",
      });
    },
  });

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyContent.trim()) {
      createPost.mutate(replyContent.trim());
    }
  };

  if (threadLoading) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </ForumLayout>
    );
  }

  if (!thread) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Discussion introuvable</h1>
          <p className="text-muted-foreground mb-6">
            Cette discussion n'existe pas ou a été supprimée.
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

  const canReply = user && !thread.isLocked && user.role !== "new_user";

  return (
    <ForumLayout showStatsSidebar={false}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/categorie/${thread.category?.slug}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Badge variant="outline">{thread.category?.name}</Badge>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap" data-testid="text-thread-title">
                {thread.isPinned && <Pin className="h-5 w-5 text-primary shrink-0" />}
                {thread.isLocked && <Lock className="h-5 w-5 text-muted-foreground shrink-0" />}
                {thread.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{thread.viewCount} vues</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{thread.replyCount} réponses</span>
                </div>
                <span>
                  Créé {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true, locale: fr })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {thread.author?.username?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{thread.author?.username}</span>
                    {getRoleBadge(thread.author?.role || "new_user")}
                    <Badge variant="secondary" className="text-xs">Auteur</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(thread.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{thread.content}</p>
            </div>
          </CardContent>
        </Card>

        {(posts?.length || 0) > 0 && (
          <>
            <Separator />
            <h2 className="text-lg font-semibold">
              {thread.replyCount} {thread.replyCount === 1 ? "Réponse" : "Réponses"}
            </h2>
            <div className="space-y-4">
              {postsLoading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                posts?.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    user={user}
                    threadLocked={thread.isLocked}
                    onDelete={(postId) => deletePost.mutate(postId)}
                  />
                ))
              )}
            </div>
          </>
        )}

        {canReply ? (
          <Card>
            <CardHeader className="pb-2">
              <h3 className="font-semibold">Répondre</h3>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReply} className="space-y-4">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Écrivez votre réponse..."
                  className="min-h-[120px]"
                  data-testid="input-reply"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!replyContent.trim() || createPost.isPending}
                    data-testid="button-submit-reply"
                  >
                    {createPost.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Publication...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Publier
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : thread.isLocked ? (
          <Card>
            <CardContent className="py-6 text-center">
              <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Cette discussion est verrouillée.
              </p>
            </CardContent>
          </Card>
        ) : !user ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-4">
                Connectez-vous pour répondre à cette discussion.
              </p>
              <Button asChild>
                <Link href="/connexion">Se connecter</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </ForumLayout>
  );
}
