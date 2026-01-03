"use client";

import { useEffect, useRef } from "react";
import type { Citation } from "@/lib/types";

interface SourceDrawerProps {
  citation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SourceDrawer({
  citation,
  isOpen,
  onClose,
}: SourceDrawerProps) {
  const previousOverflowRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      // Capture the current overflow value before modifying it
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      // Restore the previous overflow value when closing
      document.body.style.overflow = previousOverflowRef.current;
    }
    return () => {
      // Restore the previous overflow value on cleanup
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [isOpen]);

  const formatDate = (dateString: string) => {
    // Guard against null/undefined input
    if (!dateString) {
      return "Unknown date";
    }

    // Attempt to construct the date
    const date = new Date(dateString);

    // Check if the parsed date is valid
    if (isNaN(date.getTime())) {
      return "Unknown date";
    }

    // Return the formatted date
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isValidUrl = (urlString: string | undefined | null): boolean => {
    if (!urlString) {
      return false;
    }

    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen && citation ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen && citation ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
            <h2 className="headline-sm text-ink-900">Source Details</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-ink-400 hover:bg-ink-50 hover:text-ink-600"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          {citation && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
                    Title
                  </h3>
                  <p className="mt-1 text-lg font-medium text-ink-900">
                    {citation.title}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
                    Publisher
                  </h3>
                  <p className="mt-1 text-ink-900">{citation.publisher}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
                    Retrieved Date
                  </h3>
                  <p className="mt-1 text-ink-900">
                    {formatDate(citation.retrieved_at)}
                  </p>
                </div>

                {citation.snippet && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
                      Relevant Excerpt
                    </h3>
                    <blockquote className="mt-2 border-l-4 border-amber-500 pl-4 italic text-ink-700">
                      &quot;{citation.snippet}&quot;
                    </blockquote>
                  </div>
                )}

                <div className="pt-6">
                  {isValidUrl(citation.url) ? (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center bg-ink-900 border-2 border-black px-4 py-3 font-medium text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-ink-800"
                    >
                      Visit Original Source
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="flex w-full items-center justify-center bg-ink-300 border-2 border-ink-400 px-4 py-3 font-medium text-ink-500 cursor-not-allowed opacity-60"
                    >
                      Source Unavailable
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
