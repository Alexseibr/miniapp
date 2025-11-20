import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AdsList from "@/pages/ads-list";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products-simple";
import Categories from "@/pages/categories-simple";
import NearbyPage from "@/pages/nearby";
import FavoritesRoute from "@/pages/favorites";
import NotFound from "@/pages/not-found";
import AdCreate from "@/pages/ad-create";
import AdDetails from "@/pages/ad-details";
import ChatPage from "@/pages/chat-page";
import AdminPage from "@/pages/admin";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ads" component={AdsList} />
      <Route path="/ads/new" component={AdCreate} />
      <Route path="/ads/:id" component={AdDetails} />
      <Route path="/chat/:conversationId" component={ChatPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/categories" component={Categories} />
      <Route path="/nearby" component={NearbyPage} />
      <Route path="/favorites" component={FavoritesRoute} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
