import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Shield,
  Users,
  MessageSquare,
  FileText,
  MoreVertical,
  Check,
  X,
  Ban,
  UserCog,
  Clock,
  Search,
  ArrowLeft,
} from "lucide-react";
import type { User, PrivateInviteWithRelations, ModerationLogWithRelations } from "@shared/schema";

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge variant="destructive">Admin</Badge>;
    case "moderator":
      return <Badge className="bg-blue-500 text-white">Mod</Badge>;
    case "member":
      return <Badge variant="secondary">Membre</Badge>;
    default:
      return <Badge variant="outline">Nouveau</Badge>;
  }
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalThreads: number;
    totalPosts: number;
    pendingInvites: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && (user.role === "admin" || user.role === "moderator"),
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && (user.role === "admin" || user.role === "moderator"),
  });

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery<PrivateInviteWithRelations[]>({
    queryKey: ["/api/admin/pending-invites"],
    enabled: !!user && (user.role === "admin" || user.role === "moderator"),
  });

  const { data: logs, isLoading: logsLoading } = useQuery<ModerationLogWithRelations[]>({
    queryKey: ["/api/admin/moderation-logs"],
    enabled: !!user && (user.role === "admin" || user.role === "moderator"),
  });

  const updateInvite = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "approved" | "rejected" }) => {
      return apiRequest("PATCH", `/api/admin/private-invites/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Demande mise à jour",
        description: "La demande d'accès a été traitée.",
      });
    },
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle de l'utilisateur a été modifié.",
      });
    },
  });

  const banUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/ban`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Utilisateur banni",
        description: "L'utilisateur a été banni du forum.",
      });
    },
  });

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p className="text-muted-foreground mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
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

  const filteredUsers = users?.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ForumLayout showStatsSidebar={false}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Administration
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-users">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalUsers || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-threads">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalThreads || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Discussions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-total-posts">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.totalPosts || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-pending-invites">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : stats?.pendingInvites || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Demandes en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invites" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invites" data-testid="tab-invites">
              Demandes d'accès
              {(stats?.pendingInvites || 0) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats?.pendingInvites}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Journal de modération</TabsTrigger>
          </TabsList>

          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle>Demandes d'accès à la section privée</CardTitle>
                <CardDescription>
                  Examinez et approuvez les demandes d'accès à la section Makist
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 border rounded-md">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingInvites?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune demande en attente
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInvites?.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-start gap-4 p-4 border rounded-md"
                        data-testid={`invite-${invite.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {invite.user?.username?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{invite.user?.username}</span>
                            {getRoleBadge(invite.user?.role || "new_user")}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(invite.createdAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {invite.reason}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => updateInvite.mutate({ id: invite.id, status: "approved" })}
                            disabled={updateInvite.isPending}
                            data-testid={`button-approve-${invite.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateInvite.mutate({ id: invite.id, status: "rejected" })}
                            disabled={updateInvite.isPending}
                            data-testid={`button-reject-${invite.id}`}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Gestion des utilisateurs</CardTitle>
                    <CardDescription>
                      Gérez les rôles et les permissions des utilisateurs
                    </CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Inscrit</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers?.map((u) => (
                        <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {u.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            {u.isBanned ? (
                              <Badge variant="destructive">Banni</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                Actif
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(u.createdAt), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" && u.id !== user.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" data-testid={`button-user-menu-${u.id}`}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => updateUserRole.mutate({ userId: u.id, role: "member" })}
                                  >
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Promouvoir en Membre
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateUserRole.mutate({ userId: u.id, role: "moderator" })}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Promouvoir en Modérateur
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => banUser.mutate({ userId: u.id, reason: "Violation des règles" })}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Bannir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Journal de modération</CardTitle>
                <CardDescription>
                  Historique des actions de modération
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : logs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune action de modération enregistrée
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modérateur</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <span className="font-medium">{log.moderator?.username}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.targetUser?.username || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                            {log.reason || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ForumLayout>
  );
}
