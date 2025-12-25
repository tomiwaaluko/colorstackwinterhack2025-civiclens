"use client";

import { useSearchParams } from "next/navigation";
import AskPanel from "@/components/AskPanel";
import { Suspense } from "react";

function AskPageContent() {
  const searchParams = useSearchParams();
  const politicianIds = searchParams.get("politicians")
    ? searchParams.get("politicians")?.split(",")
    : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="headline-xl mb-4 text-ink-900">Ask a Question</h1>
        <p className="text-lg text-ink-600 max-w-2xl mx-auto">
          Get evidence-based answers about politicians' voting records,
          statements, and donors.
        </p>
      </div>
      <AskPanel politicianIds={politicianIds} />
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <AskPageContent />
    </Suspense>
  );
}
