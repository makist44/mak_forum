import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import CategoryPage from "@/pages/category";
import ThreadPage from "@/pages/thread";
import NewThreadPage from "@/pages/new-thread";
import RequestAccessPage from "@/pages/request-access";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/connexion" component={LoginPage} />
      <Route path="/inscription" component={RegisterPage} />
      <Route path="/categorie/:slug" component={CategoryPage} />
      <Route path="/discussion/:id" component={ThreadPage} />
      <Route path="/nouveau-sujet" component={NewThreadPage} />
      <Route path="/demande-acces" component={RequestAccessPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
