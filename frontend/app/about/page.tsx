export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-ink-200 bg-white p-8 shadow-sm sm:p-12">
        <h1 className="headline-lg mb-8 text-ink-900">About CivicLens</h1>

        <div className="prose prose-ink max-w-none">
          <p className="lead text-xl text-ink-600">
            CivicLens is an AI-powered tool designed to bring clarity to
            political discourse through evidence-based analysis.
          </p>

          <h2 className="headline-md mt-12 mb-6 text-ink-900">
            Responsible AI Principles
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>
                <strong>No Rankings or Endorsements:</strong> We provide facts,
                not opinions. We do not rank politicians or endorse candidates.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>
                <strong>Evidence-Only Summarization:</strong> Every claim is
                backed by a verifiable citation. If we can't prove it, we don't
                say it.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>
                <strong>No Predictions:</strong> We analyze past actions and
                statements. We do not predict future behavior or election
                outcomes.
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
              <span>
                <strong>Privacy-First:</strong> We do not track user behavior or
                store personal search history.
              </span>
            </li>
          </ul>

          <h2 className="headline-md mt-12 mb-6 text-ink-900">
            Limitations & Transparency
          </h2>
          <div className="rounded-lg bg-ink-50 p-6">
            <p className="text-ink-700">
              Our AI models are designed to be conservative. When evidence is
              insufficient, we clearly state{" "}
              <strong>"Insufficient data"</strong> rather than making
              speculative claims. We acknowledge that public records may be
              incomplete, and we strive to provide the most accurate picture
              possible based on available data.
            </p>
          </div>

          <h2 className="headline-md mt-12 mb-6 text-ink-900">
            Reporting Issues
          </h2>
          <p className="text-ink-700">
            We are committed to accuracy. If you find incorrect information or
            missing citations, please report it through our issue tracking
            system.
          </p>
        </div>
      </div>
    </div>
  );
}
