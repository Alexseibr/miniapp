import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import AdsListPage from "@/pages/AdsListPage";
import AdDetailsPage from "@/pages/AdDetailsPage";
import LoginPage from "@/pages/LoginPage";
import FavoritesPage from "@/pages/FavoritesPage";
import NotFoundPage from "@/pages/NotFoundPage";

const AccountPage = lazy(() => import("@/pages/AccountPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="loader">Загрузка…</div>}>
        <Layout>
          <Routes>
            <Route path="/" element={<AdsListPage />} />
            <Route path="/ads/:id" element={<AdDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
