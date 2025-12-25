export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          About CivicLens
        </h1>
        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">
            Responsible AI Disclosures
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>No rankings or endorsements</li>
            <li>No predictions about future behavior</li>
            <li>Evidence-only summarization</li>
            <li>Privacy-first (no user tracking)</li>
            <li>All claims are cited with sources</li>
          </ul>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">
            Limitations
          </h2>
          <p className="text-gray-700">
            When evidence is insufficient, we clearly state "Insufficient data" rather than making speculative claims.
          </p>
          <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">
            Reporting Issues
          </h2>
          <p className="text-gray-700">
            If you find incorrect information or missing citations, please report it through our issue tracking system.
          </p>
        </div>
      </div>
    </div>
  );
}

