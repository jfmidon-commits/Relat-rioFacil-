import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RelatórioFácil",
  description: "Auditorias de campo, evidências e relatórios automáticos em um só fluxo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
