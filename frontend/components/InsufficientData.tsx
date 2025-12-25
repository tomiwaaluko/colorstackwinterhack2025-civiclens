interface InsufficientDataProps {
  title?: string;
  message?: string;
}

export default function InsufficientData({
  title = "Insufficient Data",
  message = "There is not enough evidence available to display this information.",
}: InsufficientDataProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100">
        <svg
          className="h-6 w-6 text-ink-400"
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
      <h3 className="text-lg font-medium text-ink-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-500">{message}</p>
    </div>
  );
}
