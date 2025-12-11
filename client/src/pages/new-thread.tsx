import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ForumLayout } from "@/components/layout/forum-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import type { Category } from "@shared/schema";

const newThreadSchema = z.object({
  title: z.string().min(5, "Le titre doit contenir au moins 5 caractères").max(255),
  content: z.string().min(10, "Le contenu doit contenir au moins 10 caractères"),
  categoryId: z.string().min(1, "Veuillez sélectionner une catégorie"),
});

type NewThreadForm = z.infer<typeof newThreadSchema>;

export default function NewThreadPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const defaultCategory = searchParams.get("category") || "";
  const { toast } = useToast();

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<NewThreadForm>({
    resolver: zodResolver(newThreadSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: "",
    },
  });

  // Set default category after categories load
  useState(() => {
    if (defaultCategory && categories) {
      const cat = categories.find(c => c.slug === defaultCategory);
      if (cat) {
        form.setValue("categoryId", cat.id.toString());
      }
    }
  });

  const createThread = useMutation({
    mutationFn: async (data: NewThreadForm) => {
      const response = await apiRequest("POST", "/api/threads", {
        title: data.title,
        content: data.content,
        categoryId: parseInt(data.categoryId),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Discussion créée",
        description: "Votre discussion a été publiée avec succès.",
      });
      setLocation(`/discussion/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewThreadForm) => {
    createThread.mutate(data);
  };

  if (!user) {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Connexion requise</h1>
          <p className="text-muted-foreground mb-6">
            Vous devez être connecté pour créer une discussion.
          </p>
          <Button asChild>
            <Link href="/connexion">Se connecter</Link>
          </Button>
        </div>
      </ForumLayout>
    );
  }

  if (user.role === "new_user") {
    return (
      <ForumLayout showStatsSidebar={false}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Accès restreint</h1>
          <p className="text-muted-foreground mb-6">
            Les nouveaux utilisateurs ne peuvent pas encore créer de discussions.
            Participez d'abord aux discussions existantes.
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

  const visibleCategories = categories?.filter(
    (cat) => !cat.isPrivate || user.hasPrivateAccess
  );

  return (
    <ForumLayout showStatsSidebar={false}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Nouvelle Discussion
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer une nouvelle discussion</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={categoriesLoading}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {visibleCategories?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Titre de votre discussion"
                          {...field}
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenu</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Écrivez le contenu de votre discussion..."
                          className="min-h-[200px]"
                          {...field}
                          data-testid="input-content"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/">Annuler</Link>
                  </Button>
                  <Button
                    type="submit"
                    disabled={createThread.isPending}
                    data-testid="button-submit"
                  >
                    {createThread.isPending ? (
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
            </Form>
          </CardContent>
        </Card>
      </div>
    </ForumLayout>
  );
}
