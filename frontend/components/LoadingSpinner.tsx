export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-ink-100 border-t-ink-900"></div>
      <span className="text-sm font-medium text-ink-500 uppercase tracking-wider">
        Loading Analysis...
      </span>
    </div>
  );
}
