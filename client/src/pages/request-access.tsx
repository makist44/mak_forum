import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock, Clock, CheckCircle, XCircle, Loader2, Send } from "lucide-react";
import type { PrivateInvite } from "@shared/schema";

export default function RequestAccessPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [reason, setReason] = useState("");

  const { data: existingRequest, isLoading } = useQuery<PrivateInvite | null>({
    queryKey: ["/api/private-invites/my-request"],
    enabled: !!user,
  });

  const submitRequest = useMutation({
    mutationFn: async (reason: string) => {
      return apiRequest("POST", "/api/private-invites", { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-invites/my-request"] });
      toast({
        title: "Demande envoyée",
        description: "Votre demande d'accès a été soumise aux administrateurs.",
      });
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length >= 50) {
      submitRequest.mutate(reason.trim());
    }
  };

  if (!user) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être connecté pour demander l'accès à la section privée.
          </p>
          <Button asChild>
            <Link href="/connexion">Se connecter</Link>
          </Button>
        </div>
      </ForumLayout>
    );
  }

  if (user.hasPrivateAccess) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Accès accordé</h1>
          <p className="text-muted-foreground mb-6">
            Vous avez déjà accès à la section privée Makist.
          </p>
          <Button asChild>
            <Link href="/categorie/makist">
              Accéder à la section privée
            </Link>
          </Button>
        </div>
      </ForumLayout>
    );
  }

  if (isLoading) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ForumLayout>
    );
  }

  return (
    <ForumLayout showStatsSidebar={false}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Demande d'Accès Privé
          </h1>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle>Section Makist</CardTitle>
            <CardDescription>
              Cette section privée est réservée aux membres approuvés manuellement par les administrateurs.
              Elle contient des discussions sensibles et confidentielles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {existingRequest ? (
              <div className="text-center py-6">
                {existingRequest.status === "pending" && (
                  <>
                    <Clock className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <Badge variant="secondary" className="mb-4">
                      En attente
                    </Badge>
                    <h3 className="font-semibold mb-2">Demande en cours d'examen</h3>
                    <p className="text-sm text-muted-foreground">
                      Votre demande est actuellement examinée par les administrateurs.
                      Vous serez notifié de la décision.
                    </p>
                  </>
                )}
                {existingRequest.status === "approved" && (
                  <>
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <Badge className="mb-4 bg-green-500 text-white">Approuvé</Badge>
                    <h3 className="font-semibold mb-2">Demande approuvée</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Félicitations ! Votre accès a été approuvé.
                    </p>
                    <Button asChild>
                      <Link href="/categorie/makist">
                        Accéder à la section privée
                      </Link>
                    </Button>
                  </>
                )}
                {existingRequest.status === "rejected" && (
                  <>
                    <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
                    <Badge variant="destructive" className="mb-4">Refusé</Badge>
                    <h3 className="font-semibold mb-2">Demande refusée</h3>
                    <p className="text-sm text-muted-foreground">
                      Votre demande a été refusée par les administrateurs.
                      Vous pouvez soumettre une nouvelle demande après avoir participé davantage à la communauté.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Pourquoi souhaitez-vous accéder à cette section ?
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Expliquez votre intérêt pour cette section privée, votre lien avec la communauté Amazigh, et pourquoi vous pensez que votre accès serait bénéfique..."
                    className="min-h-[150px]"
                    data-testid="input-reason"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Minimum 50 caractères ({reason.length}/50)
                  </p>
                </div>

                <div className="bg-muted/50 rounded-md p-4 text-sm">
                  <h4 className="font-medium mb-2">Critères d'approbation :</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Participation active dans les autres sections du forum</li>
                    <li>Respect des règles de la communauté</li>
                    <li>Motivation claire et sincère</li>
                    <li>Approbation par un administrateur</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={reason.trim().length < 50 || submitRequest.isPending}
                  data-testid="button-submit"
                >
                  {submitRequest.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ForumLayout>
  );
}
