import type { Metadata } from "next";
import { Space_Grotesk, Lora, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CacheProvider } from "@/components/CacheProvider";

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
  title: {
    default: "CivicLens",
    template: "%s | CivicLens",
  },
  description:
    "Transparent, evidence-based political information. Search politicians, compare voting records, explore campaign donations, and ask AI-powered questions with verified citations. No rankings, just facts.",
  keywords: [
    "politics",
    "politicians",
    "voting records",
    "campaign finance",
    "congress",
    "senate",
    "house of representatives",
    "political transparency",
    "civic engagement",
    "evidence-based politics",
  ],
  authors: [{ name: "CivicLens" }],
  creator: "CivicLens",
  publisher: "CivicLens",
  metadataBase: new URL("https://civiclens.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "CivicLens - Evidence-Based Political Insight",
    description:
      "Transparent, evidence-based political information. Search politicians, compare voting records, explore donations, and ask AI questions with verified sources.",
    siteName: "CivicLens",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "CivicLens - Evidence-Based Political Insight",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CivicLens - Evidence-Based Political Insight",
    description:
      "Transparent political information with verified sources. Search politicians, compare voting records, and ask AI-powered questions.",
    images: ["/og-image.svg"],
    creator: "@civiclens",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
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
          <CacheProvider>
            <TooltipProvider>
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </TooltipProvider>
          </CacheProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
