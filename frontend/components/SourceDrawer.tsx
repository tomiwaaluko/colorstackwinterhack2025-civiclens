'use client';

import { useEffect } from 'react';
import type { Citation } from '@/lib/types';

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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !citation) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">Source Details</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close drawer"
            >
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
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {citation.title}
                </h3>
                <p className="text-sm text-gray-600">{citation.publisher}</p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Retrieved:</span>
                  <span className="text-gray-600">
                    {formatDate(citation.retrieved_at)}
                  </span>
                </div>
                {citation.source_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">Source ID:</span>
                    <span className="font-mono text-gray-600 text-xs">
                      {citation.source_id}
                    </span>
                  </div>
                )}
              </div>

              {/* Snippet */}
              {citation.snippet && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Excerpt
                  </h4>
                  <p className="text-gray-700 italic bg-gray-50 p-4 rounded-lg border border-gray-200">
                    "{citation.snippet}"
                  </p>
                </div>
              )}

              {/* Link */}
              <div className="border-t border-gray-200 pt-4">
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <span>Open Source</span>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

