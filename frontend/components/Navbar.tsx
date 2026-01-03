"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const normalizePath = (path: string): string => {
    // Remove trailing slash, but keep "/" as is
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  };

  const isActive = (path: string) =>
    normalizePath(pathname) === normalizePath(path);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Keyboard accessibility: Escape key and focus management
  useEffect(() => {
    if (!mobileMenuOpen) return;

    // Move focus to first link when menu opens
    if (firstLinkRef.current) {
      firstLinkRef.current.focus();
    }

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    // Focus trap: constrain Tab/Shift+Tab within menu
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !mobileMenuRef.current) return;

      const focusableElements =
        mobileMenuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleFocusTrap);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleFocusTrap);
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { name: "Search", path: "/" },
    { name: "Compare", path: "/compare" },
    { name: "Ask AI", path: "/ask" },
    { name: "About", path: "/about" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[var(--surface)]/80 backdrop-blur-md border-b border-[var(--ink-100)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="w-8 h-8 bg-[var(--ink-900)] rounded-lg flex items-center justify-center text-white">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <Link
              href="/"
              className="headline-sm text-[var(--ink-900)] tracking-tight"
              aria-label="CivicLens home"
            >
              CivicLens
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`relative py-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-[var(--ink-900)]"
                    : "text-[var(--ink-500)] hover:text-[var(--ink-900)]"
                }`}
              >
                {item.name}
                {isActive(item.path) && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--amber-400)] rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-[var(--ink-600)] hover:text-[var(--ink-900)] hover:bg-[var(--ink-50)] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Mobile Navigation Drawer */}
          <div
            ref={mobileMenuRef}
            className="fixed inset-x-0 top-20 z-50 bg-[var(--surface)] border-b border-[var(--ink-100)] shadow-lg md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <nav className="px-4 py-6" aria-label="Mobile navigation">
              <ul className="space-y-2">
                {navItems.map((item, index) => (
                  <li key={item.path}>
                    <Link
                      ref={index === 0 ? firstLinkRef : null}
                      href={item.path}
                      aria-current={isActive(item.path) ? "page" : undefined}
                      className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-[var(--amber-50)] text-[var(--ink-900)] border-l-4 border-[var(--amber-400)]"
                          : "text-[var(--ink-600)] hover:bg-[var(--ink-50)] hover:text-[var(--ink-900)]"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </>
      )}
    </nav>
  );
}
