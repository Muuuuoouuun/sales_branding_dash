import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeProvider from "@/components/ThemeProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="layout-wrapper">
            <Sidebar />
            <main className="layout-main">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
