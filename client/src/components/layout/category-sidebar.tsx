import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Landmark,
  BookOpen,
  Coffee,
  Heart,
  Library,
  Cpu,
  Laugh,
  Music,
  Lock,
  Home,
} from "lucide-react";
import type { Category } from "@shared/schema";

const categoryIcons: Record<string, React.ReactNode> = {
  "discussion-generale": <MessageSquare className="h-4 w-4" />,
  "politique": <Landmark className="h-4 w-4" />,
  "histoire": <BookOpen className="h-4 w-4" />,
  "hors-sujet": <Coffee className="h-4 w-4" />,
  "religion-spiritualite": <Heart className="h-4 w-4" />,
  "livres-litterature": <Library className="h-4 w-4" />,
  "technologie": <Cpu className="h-4 w-4" />,
  "memes": <Laugh className="h-4 w-4" />,
  "musique": <Music className="h-4 w-4" />,
  "makist": <Lock className="h-4 w-4" />,
};

interface CategorySidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function CategorySidebar({ className, onNavigate }: CategorySidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const visibleCategories = categories?.filter(
    (cat) => !cat.isPrivate || (user && user.hasPrivateAccess)
  );

  const handleClick = () => {
    onNavigate?.();
  };

  return (
    <aside className={cn("flex flex-col bg-sidebar border-r border-sidebar-border", className)}>
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Catégories
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          <Link
            href="/"
            onClick={handleClick}
            data-testid="link-category-home"
          >
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate",
                location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
              )}
            >
              <Home className="h-4 w-4" />
              <span>Accueil</span>
            </div>
          </Link>

          {isLoading ? (
            <div className="space-y-2 px-3 py-2">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            visibleCategories?.map((category) => {
              const isActive = location === `/categorie/${category.slug}`;
              return (
                <Link
                  key={category.id}
                  href={`/categorie/${category.slug}`}
                  onClick={handleClick}
                  data-testid={`link-category-${category.slug}`}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate",
                      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground",
                      category.isPrivate && "text-primary"
                    )}
                  >
                    <span className={category.isPrivate ? "text-primary" : ""}>
                      {categoryIcons[category.slug] || <MessageSquare className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 truncate">{category.name}</span>
                    {category.threadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {category.threadCount}
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </nav>
      </ScrollArea>
      
      {user && !user.hasPrivateAccess && (
        <div className="p-4 border-t border-sidebar-border">
          <Link href="/demande-acces" onClick={handleClick} data-testid="link-request-access">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm font-medium hover-elevate">
              <Lock className="h-4 w-4" />
              <span>Demander accès privé</span>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
