'use client';

import { useSearchParams } from 'next/navigation';
import AskPanel from '@/components/AskPanel';

export default function AskPage() {
  const searchParams = useSearchParams();
  const politicianIds = searchParams.get('politicians')
    ? searchParams.get('politicians')?.split(',')
    : undefined;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Ask a Question
      </h1>
      <AskPanel politicianIds={politicianIds} />
    </div>
  );
}

