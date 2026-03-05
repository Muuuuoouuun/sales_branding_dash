import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Sales Master Intelligence System",
  description: "Hyper-Growth Sales Strategy Engine (Top-C Edition)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="layout-wrapper">
          <Sidebar />
          <main className="layout-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
