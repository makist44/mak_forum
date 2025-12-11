import { useState, type ReactNode } from "react";
import { Header } from "./header";
import { CategorySidebar } from "./category-sidebar";
import { StatsSidebar } from "./stats-sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ForumLayoutProps {
  children: ReactNode;
  showStatsSidebar?: boolean;
}

export function ForumLayout({ children, showStatsSidebar = true }: ForumLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <CategorySidebar 
            className="h-full" 
            onNavigate={() => setMobileMenuOpen(false)} 
          />
        </SheetContent>
      </Sheet>

      <div className="flex">
        <CategorySidebar className="hidden lg:flex w-64 h-[calc(100vh-4rem)] sticky top-16 shrink-0" />
        
        <main className={cn(
          "flex-1 min-w-0",
          showStatsSidebar ? "xl:mr-80" : ""
        )}>
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            {children}
          </div>
        </main>

        {showStatsSidebar && (
          <StatsSidebar className="hidden xl:block w-80 h-[calc(100vh-4rem)] sticky top-16 shrink-0 border-l border-border bg-card" />
        )}
      </div>
    </div>
  );
}
