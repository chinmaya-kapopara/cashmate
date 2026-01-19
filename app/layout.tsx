import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CashMate",
  description: "Centralized app to track shared family balance - add income and expenses, see who added each transaction",
  manifest: "/manifest.json",
  icons: {
    icon: "/cashmate_wallet_logo.png",
    apple: "/cashmate_wallet_logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CashMate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
