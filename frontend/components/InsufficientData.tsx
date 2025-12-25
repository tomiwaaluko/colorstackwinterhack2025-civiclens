interface InsufficientDataProps {
  title?: string;
  message?: string;
}

export default function InsufficientData({
  title = 'Insufficient Data',
  message = 'There is not enough evidence available to display this information.',
}: InsufficientDataProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-medium text-amber-900">{title}</h3>
      <p className="mt-2 text-sm text-amber-700">{message}</p>
    </div>
  );
}

