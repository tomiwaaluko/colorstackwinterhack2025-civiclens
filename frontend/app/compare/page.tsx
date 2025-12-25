"use client";

import { useSearchParams } from "next/navigation";
import CompareView from "@/components/CompareView";
import { Suspense } from "react";

function ComparePageContent() {
  const searchParams = useSearchParams();
  const politicianAId = searchParams.get("a") || undefined;
  const politicianBId = searchParams.get("b") || undefined;
  const topic = searchParams.get("topic") || undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="headline-xl text-ink-900">Compare Politicians</h1>
        <p className="mt-2 text-lg text-ink-600">
          Side-by-side analysis of voting records, donors, and statements.
        </p>
      </div>
      <CompareView
        politicianAId={politicianAId}
        politicianBId={politicianBId}
        topic={topic}
      />
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
