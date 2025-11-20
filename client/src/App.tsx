import { BrowserRouter, Route, Routes } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AdsList from "@/pages/ads-list";
import FavoritesRoute from "@/pages/favorites";
import AccountPage from "@/pages/account";
import LoginPage from "@/pages/login";
import AdDetails from "@/pages/ad-details";
import ChatPage from "@/pages/chat-page";
import AdCreate from "@/pages/ad-create";
import AdEditPage from "@/pages/ad-edit";
import NotFoundPage from "@/pages/not-found";
import AdminPage from "@/pages/dashboard";
import Layout from "@/components/Layout";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<AdsList />} />
              <Route path="/ads" element={<AdsList />} />
              <Route path="/ads/new" element={<AdCreate />} />
              <Route path="/ads/:id" element={<AdDetails />} />
              <Route path="/ads/:id/edit" element={<AdEditPage />} />
              <Route path="/favorites" element={<FavoritesRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/chat/:conversationId" element={<ChatPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
