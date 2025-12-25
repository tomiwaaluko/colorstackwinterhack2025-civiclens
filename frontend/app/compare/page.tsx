'use client';

import { useSearchParams } from 'next/navigation';
import CompareView from '@/components/CompareView';

export default function ComparePage() {
  const searchParams = useSearchParams();
  const politicianAId = searchParams.get('a') || undefined;
  const politicianBId = searchParams.get('b') || undefined;
  const topic = searchParams.get('topic') || undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Compare Politicians
      </h1>
      <CompareView
        politicianAId={politicianAId}
        politicianBId={politicianBId}
        topic={topic}
      />
    </div>
  );
}

