import type { Metadata } from "next";
import { Noto_Sans_KR, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

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
    <html lang="ko" suppressHydrationWarning>
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="appShell">
            <Sidebar />
            <main className="appMain">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
