import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import MobileNavbar from "@/components/MobileNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RouteIQ | Geospatial Fleet Routing Optimizer",
  description: "Intelligent Capacitated Vehicle Routing Problem (CVRP) solver optimized with real-world Nigerian road conditions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col md:flex-row bg-zinc-950 text-zinc-100 font-sans">
        <MobileNavbar />
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-[calc(100vh-3.5rem)] md:h-screen overflow-y-auto bg-zinc-900 pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}

