import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, DM_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ErrorBoundary from "@/components/ErrorBoundary";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
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
      className={`${playfair.variable} ${sourceSerif.variable} ${dmSans.variable}`}
    >
      <body className="antialiased bg-[var(--background)] text-[var(--ink-900)] min-h-screen flex flex-col">
        <ErrorBoundary>
          <Navbar />
          <main className="flex-grow">{children}</main>
          <footer className="py-8 border-t border-[var(--ink-100)] bg-[var(--surface)]">
            <div className="mx-auto max-w-7xl px-4 text-center">
              <p className="font-serif text-[var(--ink-500)] italic">
                CivicLens &mdash; Evidence First.
              </p>
              <div className="mt-4 flex justify-center gap-6 text-sm text-[var(--ink-400)] font-sans">
                <span>No Rankings</span>
                <span>&bull;</span>
                <span>No Endorsements</span>
                <span>&bull;</span>
                <span>Privacy First</span>
              </div>
            </div>
          </footer>
        </ErrorBoundary>
      </body>
    </html>
  );
}
