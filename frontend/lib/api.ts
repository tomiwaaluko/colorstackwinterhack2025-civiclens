import type {
  PoliticianProfile,
  SearchResult,
  ApiError,
  DemoData,
  ComparisonRequest,
  ComparisonResult,
  AskRequest,
  AIResponse,
  Citation,
  Vote,
  Donation,
  DonationsMapResponse,
  TimelineResponse,
  TimelineEvent,
  NetworkGraphResponse,
  NetworkNode,
  NetworkEdge,
  RadialResponse,
  EventType,
  PoliticianSummaryResponse,
} from "./types";

// API base URL - defaults to localhost for development
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Demo mode flag - set to true to use offline demo data
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Demo data for offline mode
const DEMO_DATA: DemoData = {
  politicians: [
    {
      id: "1",
      name: "John Doe",
      party: "Democrat",
      office: "Senator",
      state: "CA",
    },
    {
      id: "2",
      name: "Jane Smith",
      party: "Republican",
      office: "Representative",
      state: "TX",
      district: "5",
    },
  ],
  profiles: {
    "1": {
      politician: {
        id: "1",
        name: "John Doe",
        party: "Democrat",
        office: "Senator",
        state: "CA",
      },
      votes: [],
      donations: [],
      statements: [],
      source_count: 0,
    },
    "2": {
      politician: {
        id: "2",
        name: "Jane Smith",
        party: "Republican",
        office: "Representative",
        state: "TX",
        district: "5",
      },
      votes: [],
      donations: [],
      statements: [],
      source_count: 0,
    },
  },
};

const SEARCH_CACHE = new Map<string, SearchResult>();

type BackendPoliticianSummary = {
  id: string;
  name: string;
  image_url?: string | null;
  party?: string | null;
  state_or_district?: string | null;
  position?: string | null;
  vote_count?: number;
  statement_count?: number;
  politician_details?: {
    statements?: string[];
    votes?: string[][];
  };
};

type BackendSearchResponse = {
  politician_summaries?: BackendPoliticianSummary[];
  politicians?: SearchResult["politicians"];
  total?: number;
};

function normalizePoliticianSummary(
  summary: BackendPoliticianSummary
): PoliticianSummaryResponse {
  const stateOrDistrict = summary.state_or_district ?? undefined;
  const stateMatch = stateOrDistrict?.match(/^([A-Za-z]{2})(?:-(\d+))?$/);
  const stateCode = stateMatch ? stateMatch[1].toUpperCase() : undefined;
  const districtNumber = stateMatch?.[2];

  return {
    id: summary.id,
    name: summary.name,
    party: summary.party ?? undefined,
    position: summary.position ?? undefined,
    office: summary.position ?? undefined,
    state_or_district: stateOrDistrict,
    state_code: stateCode,
    state: stateCode ?? stateOrDistrict,
    district: districtNumber,
    district_number: districtNumber ? Number(districtNumber) : undefined,
    image_url: summary.image_url ?? undefined,
    photo_url: summary.image_url ?? undefined,
    vote_count: summary.vote_count ?? 0,
    statement_count: summary.statement_count ?? 0,
    politician_details: {
      statements: summary.politician_details?.statements ?? [],
      votes: summary.politician_details?.votes ?? [],
    },
  };
}

function normalizeSearchResponse(data: BackendSearchResponse): SearchResult {
  if (Array.isArray(data.politicians)) {
    return { politicians: data.politicians, total: data.total };
  }

  const summaries = data.politician_summaries ?? [];
  const politicians = summaries.map((summary) =>
    normalizePoliticianSummary(summary)
  );

  return { politicians, total: data.total ?? politicians.length };
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  retries: number = 2
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          code: "HTTP_ERROR",
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw error;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      // Retry on network errors (TypeError from fetch)
      if (error instanceof TypeError && attempt < retries) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
        continue;
      }
      // Treat any TypeError as a network error (fetch throws TypeError for network failures)
      if (error instanceof TypeError) {
        throw {
          code: "NETWORK_ERROR",
          message:
            "Unable to connect to the API. Please check your connection.",
        } as ApiError;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function searchPoliticians(
  name?: string,
  state?: string,
  signal?: AbortSignal
): Promise<SearchResult> {
  const cacheKey = `${name ?? ""}::${state ?? ""}`;
  if (SEARCH_CACHE.has(cacheKey)) {
    return SEARCH_CACHE.get(cacheKey) as SearchResult;
  }

  if (DEMO_MODE) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    let results = DEMO_DATA.politicians;

    // Filter by name
    if (name) {
      const searchName = name.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(searchName)
      );
    }

    // Filter by state
    if (state) {
      results = results.filter((p) => p.state === state);
    }

    const demoResult = { politicians: results };
    SEARCH_CACHE.set(cacheKey, demoResult);
    return demoResult;
  }

  const params = new URLSearchParams();
  if (name) params.append("name", name);
  if (state) params.append("state", state);

  const data = await fetchApi<BackendSearchResponse>(
    `/search?${params.toString()}`,
    { signal }
  );
  const normalized = normalizeSearchResponse(data);
  SEARCH_CACHE.set(cacheKey, normalized);
  return normalized;
}

export async function getPoliticianSummary(
  id: string,
  signal?: AbortSignal
): Promise<PoliticianSummaryResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const profile = DEMO_DATA.profiles[id];
    if (!profile) {
      throw {
        code: "NOT_FOUND",
        message: `Politician with ID ${id} not found`,
      } as ApiError;
    }
    return {
      ...profile.politician,
      politician_details: {
        statements: [],
        votes: [],
      },
      vote_count: 0,
      statement_count: 0,
    };
  }

  const data = await fetchApi<BackendPoliticianSummary>(`/politicians/${id}`, {
    signal,
  });
  return normalizePoliticianSummary(data);
}

export async function getPoliticianProfile(
  id: string
): Promise<PoliticianProfile> {
  const summary = await getPoliticianSummary(id);

  // Fetch votes, donations, and statements in parallel
  const [votesData, donationsData] = await Promise.allSettled([
    getPoliticianVotes(id).catch(() => ({ votes: [] })),
    getPoliticianDonations(id).catch(() => ({ donations: [] })),
  ]);

  const votes = votesData.status === "fulfilled" ? votesData.value.votes : [];
  const rawDonations =
    donationsData.status === "fulfilled" ? donationsData.value.donations : [];

  // Aggregate donations by category
  const donationsByCategory: Record<
    string,
    { total_amount: number; citations: Citation[] }
  > = {};

  rawDonations.forEach((donation) => {
    const category = donation.category;
    if (!donationsByCategory[category]) {
      donationsByCategory[category] = { total_amount: 0, citations: [] };
    }
    donationsByCategory[category].total_amount += donation.amount;
    donationsByCategory[category].citations.push(...donation.citations);
  });

  const donations = Object.entries(donationsByCategory).map(
    ([category, data]) => ({
      category,
      total_amount: data.total_amount,
      citation_count: data.citations.length,
      citations: data.citations,
    })
  );

  // Extract statements from politician_details if available
  const statements =
    summary.politician_details?.statements?.map((text, idx) => ({
      id: `${id}-statement-${idx}`,
      text,
      date: undefined,
      source_type: undefined,
      citations: [],
    })) || [];

  return {
    politician: summary,
    votes,
    donations,
    statements,
    source_count: undefined,
  };
}

export async function getPoliticianVotes(
  id: string
): Promise<{ votes: Vote[] }> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { votes: [] };
  }

  return fetchApi<{ votes: Vote[] }>(`/politician/${id}/votes`);
}

export async function getPoliticianDonations(
  id: string
): Promise<{ donations: Donation[] }> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { donations: [] };
  }

  return fetchApi<{ donations: Donation[] }>(`/politician/${id}/donations`);
}

export async function comparePoliticians(
  request: ComparisonRequest
): Promise<ComparisonResult> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const profileA = DEMO_DATA.profiles[request.politician_a_id];
    const profileB = DEMO_DATA.profiles[request.politician_b_id];

    if (!profileA || !profileB) {
      throw {
        code: "NOT_FOUND",
        message: "One or both politicians not found",
      } as ApiError;
    }

    return {
      politician_a: profileA,
      politician_b: profileB,
      topic: request.topic,
    };
  }

  return fetchApi<ComparisonResult>("/compare", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function askQuestion(request: AskRequest): Promise<AIResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Demo AI response matching the schema
    const demoCitations: Citation[] = [
      {
        source_id: "demo-1",
        url: "https://example.com/source1",
        title: "Voting Record Database",
        publisher: "ProPublica",
        retrieved_at: new Date().toISOString(),
        snippet: "Sample evidence snippet from voting records.",
      },
      {
        source_id: "demo-2",
        url: "https://example.com/source2",
        title: "Campaign Finance Report",
        publisher: "OpenSecrets",
        retrieved_at: new Date().toISOString(),
        snippet: "Sample evidence snippet from campaign finance data.",
      },
    ];

    const demoResponse: AIResponse = {
      answer:
        "Based on available evidence, this politician has voted on several key bills related to this topic. The voting record shows a pattern of support for measures in this area.",
      claims: [
        {
          text: "Voted yes on Bill H.R. 1234 related to the topic",
          citations: ["demo-1"],
          confidence: 0.9,
        },
        {
          text: "Received campaign contributions from organizations in this sector",
          citations: ["demo-2"],
          confidence: 0.85,
        },
      ],
      citations: demoCitations,
      limitations:
        "This response is based on limited available data. Some information may be incomplete.",
      disclosure:
        "This system provides evidence-based information only. No rankings, predictions, or endorsements are made.",
    };

    return demoResponse;
  }

  return fetchApi<AIResponse>("/api/qa/ask", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// Visualization API functions

export async function getDonationsMap(params?: {
  politician_ids?: (number | string)[];
  category?: string;
  start_date?: string;
  end_date?: string;
  aggregation_level?: string;
}): Promise<DonationsMapResponse> {
  if (DEMO_MODE) {
    // Return demo data for donations map
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      level: "state",
      values: {
        CA: {
          total_amount: 200000,
          donation_count: 5,
          avg_amount: 40000,
          top_donor_category: "Technology",
          top_category_amount: 150000,
          citations: [],
          top_politicians: [],
          top_donors: [],
        },
        NY: {
          total_amount: 150000,
          donation_count: 3,
          avg_amount: 50000,
          top_donor_category: "Finance",
          top_category_amount: 100000,
          citations: [],
          top_politicians: [],
          top_donors: [],
        },
      },
      metadata: {
        date_range: { start: null, end: null },
        citation_count: 0,
        total_states: 2,
        filters: {},
      },
    };
  }

  const queryParams = new URLSearchParams();
  if (params?.politician_ids) {
    params.politician_ids.forEach((id) =>
      queryParams.append("politician_ids", id.toString())
    );
  }
  if (params?.category) queryParams.append("category", params.category);
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  if (params?.aggregation_level)
    queryParams.append("aggregation_level", params.aggregation_level);

  return fetchApi<DonationsMapResponse>(
    `/api/visualizations/donations-map${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`
  );
}

export async function getPoliticianTimeline(
  politicianId: string | number,
  params?: {
    start_date?: string;
    end_date?: string;
    event_types?: EventType[];
  }
): Promise<TimelineResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Generate demo timeline data with clustering support
    const demoEvents = generateDemoTimelineEvents(politicianId);
    const filteredEvents = demoEvents.filter((e) => {
      if (params?.event_types && params.event_types.length > 0) {
        if (!params.event_types.includes(e.type)) return false;
      }
      if (params?.start_date && e.date < params.start_date) return false;
      if (params?.end_date && e.date > params.end_date) return false;
      return true;
    });

    return {
      events: filteredEvents,
      clusters: [], // Will be generated in the component
    };
  }

  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  if (params?.event_types) {
    params.event_types.forEach((type) =>
      queryParams.append("event_types", type)
    );
  }

  return fetchApi<TimelineResponse>(
    `/api/visualizations/politician-timeline/${politicianId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`
  );
}

// Generate demo timeline events for a politician
function generateDemoTimelineEvents(politicianId: string | number): TimelineEvent[] {
  const topics = [
    "Healthcare",
    "Energy",
    "Technology",
    "Finance",
    "Environment",
    "Defense",
  ];
  const baseYear = 2024;

  const events: TimelineEvent[] = [];
  let eventId = 1;

  // Generate events based on politician ID (for variety)
  // Convert string IDs to a numeric seed using hash
  const numericId = typeof politicianId === 'number'
    ? politicianId
    : politicianId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = numericId * 7;

  // Healthcare cluster - votes and donations close together
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-01-15`,
    title: "Affordable Care Act Extension",
    outcome: numericId % 2 === 1 ? "yes" : "no",
    topic: "Healthcare",
    citations: [
      {
        source_id: 1,
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/123",
        title: "H.R. 1234 - ACA Extension",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-15T00:00:00Z",
      },
    ],
    citation_count: 1,
    related_events: [`evt-${politicianId}-${eventId}`],
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-01-18`,
    title: "PhRMA Association PAC",
    amount: 25000 + (seed % 10) * 1000,
    topic: "Healthcare",
    citations: [
      {
        source_id: "fec-1",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q1 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
    related_events: [`evt-${politicianId}-${eventId - 2}`],
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "statement",
    date: `${baseYear}-01-22`,
    title: "Press Release on Healthcare Policy",
    topic: "Healthcare",
    citations: [
      {
        source_id: "press-1",
        source_type: "press_release",
        source_url: "https://example.com/press",
        title: "Statement on Healthcare",
        publisher: "Office Press",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // Energy cluster
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "bill_sponsor",
    date: `${baseYear}-02-10`,
    title: "Clean Energy Investment Act",
    topic: "Energy",
    citations: [
      {
        source_id: "congress-2",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/456",
        title: "S. 456 - Clean Energy",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-02-12`,
    title: "Renewable Energy PAC",
    amount: 15000 + (seed % 8) * 500,
    topic: "Energy",
    citations: [
      {
        source_id: "fec-2",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q1 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-02-28`,
    title: "Infrastructure Modernization Bill",
    outcome: numericId % 3 === 0 ? "no" : "yes",
    topic: "Energy",
    citations: [
      {
        source_id: "congress-3",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/789",
        title: "H.R. 789 - Infrastructure",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // Technology events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-03-15`,
    title: "Data Privacy Protection Act",
    outcome: "yes",
    topic: "Technology",
    citations: [
      {
        source_id: "congress-4",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/999",
        title: "S. 999 - Data Privacy",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-03-18`,
    title: "Tech Industry Coalition",
    amount: 50000 + (seed % 5) * 5000,
    topic: "Technology",
    citations: [
      {
        source_id: "fec-3",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q1 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // Finance cluster - multiple events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-04-05`,
    title: "Banking Regulation Reform",
    outcome: numericId % 2 === 0 ? "yes" : "no",
    topic: "Finance",
    citations: [
      {
        source_id: "congress-5",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/111",
        title: "H.R. 111 - Banking Reform",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-04-08`,
    title: "Wall Street PAC",
    amount: 75000 + (seed % 10) * 2500,
    topic: "Finance",
    citations: [
      {
        source_id: "fec-4",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q2 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "statement",
    date: `${baseYear}-04-10`,
    title: "Op-Ed on Financial Transparency",
    topic: "Finance",
    citations: [
      {
        source_id: "news-1",
        source_type: "news_article",
        source_url: "https://example.com/news",
        title: "Op-Ed: Financial Markets",
        publisher: "Major Newspaper",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-04-20`,
    title: "Consumer Financial Protection Amendment",
    outcome: "yes",
    topic: "Finance",
    citations: [
      {
        source_id: "congress-6",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/222",
        title: "Amendment to H.R. 111",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // Environment events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "bill_sponsor",
    date: `${baseYear}-05-01`,
    title: "National Parks Protection Act",
    topic: "Environment",
    citations: [
      {
        source_id: "congress-7",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/333",
        title: "S. 333 - Parks Protection",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-05-15`,
    title: "Environmental Defense Fund",
    amount: 10000 + (seed % 4) * 2000,
    topic: "Environment",
    citations: [
      {
        source_id: "fec-5",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q2 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // Defense events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-06-10`,
    title: "Defense Authorization Act FY2025",
    outcome: "yes",
    topic: "Defense",
    citations: [
      {
        source_id: "congress-8",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/444",
        title: "NDAA FY2025",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "donation",
    date: `${baseYear}-06-12`,
    title: "Defense Contractors PAC",
    amount: 35000 + (seed % 6) * 3000,
    topic: "Defense",
    citations: [
      {
        source_id: "fec-6",
        source_type: "fec_filing",
        source_url: "https://fec.gov/data/receipts",
        title: "FEC Filing Q2 2024",
        publisher: "FEC.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  // More scattered events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "statement",
    date: `${baseYear}-07-04`,
    title: "Independence Day Address",
    topic: "Other",
    citations: [
      {
        source_id: "press-2",
        source_type: "press_release",
        source_url: "https://example.com/press",
        title: "July 4th Statement",
        publisher: "Office Press",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-08-15`,
    title: "Education Funding Amendment",
    outcome: numericId % 2 === 1 ? "yes" : "no",
    topic: "Other",
    citations: [
      {
        source_id: "congress-9",
        source_type: "congressional_record",
        source_url: "https://congress.gov/bill/555",
        title: "Education Funding",
        publisher: "Congress.gov",
        retrieved_at: "2024-01-01T00:00:00Z",
      },
    ],
    citation_count: 1,
  });

  return events;
}

export async function getNetworkGraph(params?: {
  politician_ids?: number[];
  include_indirect?: boolean;
  min_amount?: number;
  category?: string;
}): Promise<NetworkGraphResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateDemoNetworkGraph(
      params?.politician_ids,
      params?.include_indirect,
      params?.min_amount,
      params?.category
    );
  }

  const queryParams = new URLSearchParams();
  if (params?.politician_ids) {
    params.politician_ids.forEach((id) =>
      queryParams.append("politician_ids", id.toString())
    );
  }
  if (params?.include_indirect !== undefined) {
    queryParams.append("include_indirect", params.include_indirect.toString());
  }
  if (params?.min_amount !== undefined) {
    queryParams.append("min_amount", params.min_amount.toString());
  }
  if (params?.category) {
    queryParams.append("category", params.category);
  }

  return fetchApi<NetworkGraphResponse>(
    `/api/visualizations/network-graph${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`
  );
}

// Generate demo network graph data
function generateDemoNetworkGraph(
  politicianIds?: number[],
  includeIndirect?: boolean,
  minAmount?: number,
  category?: string
): NetworkGraphResponse {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // Politicians
  const politicians = [
    { id: 1, name: "Alexandria Ocasio-Cortez", party: "Democrat" },
    { id: 2, name: "Ted Cruz", party: "Republican" },
    { id: 3, name: "Bernie Sanders", party: "Independent" },
    { id: 4, name: "Marco Rubio", party: "Republican" },
    { id: 5, name: "Elizabeth Warren", party: "Democrat" },
    { id: 6, name: "Mitch McConnell", party: "Republican" },
  ];

  // Filter politicians if IDs provided
  const activePoliticians =
    politicianIds && politicianIds.length > 0
      ? politicians.filter((p) => politicianIds.includes(p.id))
      : politicians;

  // Donors by category
  const donors: Array<{
    id: string;
    name: string;
    category: string;
    amount: number;
  }> = [
    // Healthcare
    {
      id: "donor-pharma",
      name: "PhRMA Association",
      category: "Healthcare",
      amount: 150000,
    },
    {
      id: "donor-hospital",
      name: "American Hospital Assoc.",
      category: "Healthcare",
      amount: 85000,
    },
    {
      id: "donor-insurance",
      name: "Health Insurance PAC",
      category: "Healthcare",
      amount: 120000,
    },
    // Energy
    {
      id: "donor-oil",
      name: "American Petroleum Institute",
      category: "Energy",
      amount: 200000,
    },
    {
      id: "donor-solar",
      name: "Solar Energy Industries",
      category: "Energy",
      amount: 75000,
    },
    {
      id: "donor-coal",
      name: "Coal Mining PAC",
      category: "Energy",
      amount: 90000,
    },
    // Finance
    {
      id: "donor-banks",
      name: "American Bankers Assoc.",
      category: "Finance",
      amount: 180000,
    },
    {
      id: "donor-wallstreet",
      name: "Wall Street PAC",
      category: "Finance",
      amount: 250000,
    },
    {
      id: "donor-credit",
      name: "Credit Union National",
      category: "Finance",
      amount: 65000,
    },
    // Technology
    {
      id: "donor-tech",
      name: "TechNet",
      category: "Technology",
      amount: 175000,
    },
    {
      id: "donor-internet",
      name: "Internet Association",
      category: "Technology",
      amount: 95000,
    },
    // Defense
    {
      id: "donor-defense",
      name: "Defense Contractors PAC",
      category: "Defense",
      amount: 220000,
    },
    {
      id: "donor-aerospace",
      name: "Aerospace Industries",
      category: "Defense",
      amount: 140000,
    },
  ];

  // Bills by category
  const bills: Array<{ id: string; name: string; category: string }> = [
    {
      id: "bill-aca",
      name: "Affordable Care Act Extension",
      category: "Healthcare",
    },
    { id: "bill-drug", name: "Drug Pricing Reform", category: "Healthcare" },
    {
      id: "bill-energy",
      name: "Clean Energy Investment Act",
      category: "Energy",
    },
    {
      id: "bill-infra",
      name: "Infrastructure Modernization",
      category: "Energy",
    },
    { id: "bill-bank", name: "Banking Regulation Reform", category: "Finance" },
    {
      id: "bill-cfpb",
      name: "Consumer Financial Protection",
      category: "Finance",
    },
    {
      id: "bill-privacy",
      name: "Data Privacy Protection Act",
      category: "Technology",
    },
    { id: "bill-ai", name: "AI Safety Standards", category: "Technology" },
    {
      id: "bill-ndaa",
      name: "Defense Authorization FY2025",
      category: "Defense",
    },
  ];

  // Filter by category if provided
  const filteredDonors = category
    ? donors.filter((d) => d.category === category)
    : donors;
  const filteredBills = category
    ? bills.filter((b) => b.category === category)
    : bills;

  // Filter by minimum amount
  const amountFilteredDonors = minAmount
    ? filteredDonors.filter((d) => d.amount >= minAmount)
    : filteredDonors;

  // Add politician nodes
  activePoliticians.forEach((pol) => {
    nodes.push({
      id: `pol-${pol.id}`,
      label: pol.name,
      type: "politician",
      party: pol.party,
      metadata: { party: pol.party },
    });
  });

  // Add donor nodes
  amountFilteredDonors.forEach((donor) => {
    nodes.push({
      id: donor.id,
      label: donor.name,
      type: "donor",
      category: donor.category,
      amount: donor.amount,
      metadata: { category: donor.category, total_amount: donor.amount },
    });
  });

  // Add bill nodes
  filteredBills.forEach((bill) => {
    nodes.push({
      id: bill.id,
      label: bill.name,
      type: "bill",
      category: bill.category,
      metadata: { category: bill.category },
    });
  });

  // Create donation edges (donor → politician)
  activePoliticians.forEach((pol) => {
    const seed = pol.id * 17;
    amountFilteredDonors.forEach((donor, idx) => {
      // Vary donations by politician and donor
      const baseAmount = Math.floor(donor.amount / (3 + (seed % 3)));
      const variation = ((seed + idx) % 5) * 1000;
      const donationAmount = baseAmount + variation;

      // Only some politicians receive from each donor
      if ((seed + idx) % 3 !== 0) {
        edges.push({
          source: donor.id,
          target: `pol-${pol.id}`,
          type: "donation",
          weight: donationAmount,
          category: donor.category,
          date: `2024-0${(idx % 9) + 1}-15`,
          metadata: { amount: donationAmount, category: donor.category },
        });
      }
    });
  });

  // Create sponsor edges (politician → bill)
  activePoliticians.forEach((pol) => {
    const seed = pol.id * 13;
    filteredBills.forEach((bill, idx) => {
      // Only some politicians sponsor each bill
      if ((seed + idx) % 4 !== 0) {
        edges.push({
          source: `pol-${pol.id}`,
          target: bill.id,
          type: "sponsor",
          weight: 1,
          category: bill.category,
          metadata: {
            role: (seed + idx) % 2 === 0 ? "primary_sponsor" : "cosponsor",
          },
        });
      }
    });
  });

  // Create vote edges (politician → bill)
  activePoliticians.forEach((pol) => {
    const seed = pol.id * 7;
    filteredBills.forEach((bill, idx) => {
      const vote = (seed + idx) % 3 === 0 ? "no" : "yes";
      edges.push({
        source: `pol-${pol.id}`,
        target: bill.id,
        type: "vote",
        weight: vote === "yes" ? 1 : -1,
        category: bill.category,
        metadata: { vote },
      });
    });
  });

  // Create indirect edges (donor → bill via shared politicians) if requested
  if (includeIndirect) {
    amountFilteredDonors.forEach((donor) => {
      // Find politicians who received from this donor
      const donorPoliticians = edges
        .filter((e) => e.source === donor.id && e.type === "donation")
        .map((e) => e.target);

      // Find bills those politicians voted on
      const relatedBills = new Set<string>();
      donorPoliticians.forEach((polId) => {
        edges
          .filter(
            (e) =>
              e.source === polId && (e.type === "vote" || e.type === "sponsor")
          )
          .forEach((e) => relatedBills.add(e.target));
      });

      // Create indirect edge to bills in same category
      relatedBills.forEach((billId) => {
        const bill = filteredBills.find((b) => b.id === billId);
        if (bill && bill.category === donor.category) {
          // Check if edge doesn't already exist
          const exists = edges.some(
            (e) => e.source === donor.id && e.target === billId
          );
          if (!exists) {
            edges.push({
              source: donor.id,
              target: billId,
              type: "indirect",
              weight: donor.amount / 10,
              category: donor.category,
              metadata: {
                description:
                  "Indirect connection via donation to related politicians",
                via_politicians: donorPoliticians.length,
              },
            });
          }
        }
      });
    });
  }

  // Generate clusters
  const categories = [
    ...new Set([
      ...filteredDonors.map((d) => d.category),
      ...filteredBills.map((b) => b.category),
    ]),
  ];
  const categoryColors: Record<string, string> = {
    Healthcare: "#ef4444",
    Energy: "#f59e0b",
    Technology: "#3b82f6",
    Finance: "#10b981",
    Defense: "#6b7280",
  };

  const clusters = categories.map((cat) => ({
    id: `cluster-${cat.toLowerCase()}`,
    name: cat,
    category: cat,
    node_ids: [
      ...amountFilteredDonors
        .filter((d) => d.category === cat)
        .map((d) => d.id),
      ...filteredBills.filter((b) => b.category === cat).map((b) => b.id),
    ],
    color: categoryColors[cat] || "#9ca3af",
  }));

  return { nodes, edges, clusters };
}

export async function getPoliticianRadial(
  politicianId: string | number,
  params?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<RadialResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateDemoRadialData(politicianId);
  }

  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);

  return fetchApi<RadialResponse>(
    `/api/visualizations/politician-radial/${politicianId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`
  );
}

// Generate demo radial data for a politician
function generateDemoRadialData(politicianId: string | number): RadialResponse {
  // Convert string IDs to a numeric seed using hash
  const numericId = typeof politicianId === 'number'
    ? politicianId
    : politicianId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = numericId * 11;

  // Categories with related bills
  const categoryData = [
    {
      category: "Healthcare",
      baseAmount: 150000,
      baseDonations: 45,
      bills: [
        { id: "bill-aca", title: "Affordable Care Act Extension" },
        { id: "bill-drug", title: "Drug Pricing Reform" },
        { id: "bill-medicare", title: "Medicare Expansion" },
      ],
      donors: [
        { name: "PhRMA Association", amount: 75000 },
        { name: "Hospital Association", amount: 45000 },
        { name: "Health Insurance PAC", amount: 30000 },
      ],
    },
    {
      category: "Energy",
      baseAmount: 120000,
      baseDonations: 38,
      bills: [
        { id: "bill-energy", title: "Clean Energy Investment Act" },
        { id: "bill-infra", title: "Infrastructure Modernization" },
        { id: "bill-ev", title: "Electric Vehicle Incentives" },
      ],
      donors: [
        { name: "Petroleum Institute", amount: 60000 },
        { name: "Solar Industries", amount: 35000 },
        { name: "Coal Mining PAC", amount: 25000 },
      ],
    },
    {
      category: "Finance",
      baseAmount: 180000,
      baseDonations: 52,
      bills: [
        { id: "bill-bank", title: "Banking Regulation Reform" },
        { id: "bill-cfpb", title: "Consumer Financial Protection" },
        { id: "bill-crypto", title: "Cryptocurrency Standards" },
      ],
      donors: [
        { name: "Wall Street PAC", amount: 90000 },
        { name: "American Bankers", amount: 55000 },
        { name: "Credit Union National", amount: 35000 },
      ],
    },
    {
      category: "Technology",
      baseAmount: 95000,
      baseDonations: 28,
      bills: [
        { id: "bill-privacy", title: "Data Privacy Protection Act" },
        { id: "bill-ai", title: "AI Safety Standards" },
        { id: "bill-antitrust", title: "Tech Antitrust Reform" },
      ],
      donors: [
        { name: "TechNet", amount: 50000 },
        { name: "Internet Association", amount: 30000 },
        { name: "Software Alliance", amount: 15000 },
      ],
    },
    {
      category: "Defense",
      baseAmount: 140000,
      baseDonations: 35,
      bills: [
        { id: "bill-ndaa", title: "Defense Authorization FY2025" },
        { id: "bill-veterans", title: "Veterans Benefits Expansion" },
      ],
      donors: [
        { name: "Defense Contractors PAC", amount: 80000 },
        { name: "Aerospace Industries", amount: 60000 },
      ],
    },
    {
      category: "Labor",
      baseAmount: 65000,
      baseDonations: 22,
      bills: [
        { id: "bill-wage", title: "Minimum Wage Increase" },
        { id: "bill-union", title: "Union Protection Act" },
      ],
      donors: [
        { name: "AFL-CIO", amount: 35000 },
        { name: "Teachers Union", amount: 30000 },
      ],
    },
  ];

  const categories = categoryData.map((cat, idx) => {
    // Vary amounts based on politician
    const variation = ((seed + idx) % 5) * 10000 - 20000;
    const amount = Math.max(10000, cat.baseAmount + variation);
    const donations = Math.max(
      5,
      cat.baseDonations + Math.floor(variation / 5000)
    );

    // Determine vote outcomes based on politician
    const bills = cat.bills.map((bill, billIdx) => ({
      ...bill,
      vote_outcome: ((seed + idx + billIdx) % 3 === 0 ? "no" : "yes") as
        | "yes"
        | "no",
      sponsorship: ((seed + idx + billIdx) % 4 === 0
        ? "primary"
        : (seed + idx + billIdx) % 4 === 1
        ? "cosponsor"
        : null) as "primary" | "cosponsor" | null,
    }));

    return {
      category: cat.category,
      total_amount: amount,
      donation_count: donations,
      avg_amount: Math.round(amount / donations),
      citations: [
        {
          source_id: `fec-${cat.category.toLowerCase()}`,
          source_type: "fec_filing",
          source_url: "https://fec.gov/data/receipts",
          title: `FEC Filings - ${cat.category}`,
          publisher: "FEC.gov",
          retrieved_at: "2024-01-01T00:00:00Z",
        },
      ],
      related_bills: bills,
      top_donors: cat.donors.map((d, dIdx) => ({
        name: d.name,
        amount: Math.round(d.amount * (0.8 + ((seed + dIdx) % 5) * 0.1)),
      })),
    };
  });

  const totalAmount = categories.reduce((sum, c) => sum + c.total_amount, 0);
  const totalCount = categories.reduce((sum, c) => sum + c.donation_count, 0);

  return {
    categories,
    total_amount: totalAmount,
    total_count: totalCount,
  };
}

// Helper to check if we're in demo mode
export function isDemoMode(): boolean {
  return DEMO_MODE;
}
