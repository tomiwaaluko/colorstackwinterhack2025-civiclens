import type { Metadata } from "next";
import { Space_Grotesk, Lora, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "CivicLens | Evidence-Based Political Insight",
  description:
    "Search, compare, and understand politicians through evidence-based information with citations. No rankings, just facts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${lora.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col font-sans">
        <ErrorBoundary>
          <TooltipProvider>
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </TooltipProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
