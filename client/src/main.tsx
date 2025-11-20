import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FavoritesProvider } from "./features/favorites/FavoritesContext";
import { AuthProvider } from "./features/auth/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <FavoritesProvider>
        <App />
      </FavoritesProvider>
    </AuthProvider>
  </StrictMode>,
);
