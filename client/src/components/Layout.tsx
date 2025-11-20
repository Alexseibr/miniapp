import { ReactNode } from "react";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="app-root">
      <Header />
      <main className="app-main">{children}</main>
      <footer className="app-footer">Куфор-код — мини-маркетплейс объявлений</footer>
    </div>
  );
}
