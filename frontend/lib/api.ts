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
  NetworkGraphResponse,
  RadialResponse,
  EventType,
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

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

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
    // Treat any TypeError as a network error (fetch throws TypeError for network failures)
    if (error instanceof TypeError) {
      throw {
        code: "NETWORK_ERROR",
        message: "Unable to connect to the API. Please check your connection.",
      } as ApiError;
    }
    throw error;
  }
}

export async function searchPoliticians(
  name?: string,
  zip?: string,
  signal?: AbortSignal
): Promise<SearchResult> {
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

    // Filter by zip - Note: Demo data doesn't include zip codes,
    // so we filter by state as a simplified proxy. In production,
    // the API would map zip codes to representatives correctly.
    if (zip) {
      // Simple state mapping for common zip prefixes (not exhaustive)
      const zipToState: Record<string, string> = {
        "9": "CA", // CA zip codes start with 9
        "7": "TX", // Some TX zip codes start with 7
        "0": "MA", // MA zip codes start with 0
        "1": "NY", // Some NY/Northeast zip codes start with 1
        "2": "VA", // Some VA/DC area zip codes start with 2
      };

      const stateCode = zipToState[zip.charAt(0)];
      if (stateCode) {
        results = results.filter((p) => p.state === stateCode);
      }
    }

    return { politicians: results };
  }

  const params = new URLSearchParams();
  if (name) params.append("name", name);
  if (zip) params.append("zip", zip);

  return fetchApi<SearchResult>(`/search?${params.toString()}`, { signal });
}

export async function getPoliticianProfile(
  id: string
): Promise<PoliticianProfile> {
  if (DEMO_MODE) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const profile = DEMO_DATA.profiles[id];
    if (!profile) {
      throw {
        code: "NOT_FOUND",
        message: `Politician with ID ${id} not found`,
      } as ApiError;
    }
    return profile;
  }

  return fetchApi<PoliticianProfile>(`/politician/${id}`);
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

  return fetchApi<AIResponse>("/ai/ask", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// Visualization API functions

export async function getDonationsMap(params?: {
  politician_ids?: number[];
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
    params.politician_ids.forEach((id) => queryParams.append("politician_ids", id.toString()));
  }
  if (params?.category) queryParams.append("category", params.category);
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);
  if (params?.aggregation_level) queryParams.append("aggregation_level", params.aggregation_level);

  return fetchApi<DonationsMapResponse>(
    `/api/visualizations/donations-map${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
}

export async function getPoliticianTimeline(
  politicianId: number,
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
    params.event_types.forEach((type) => queryParams.append("event_types", type));
  }

  return fetchApi<TimelineResponse>(
    `/api/visualizations/politician-timeline/${politicianId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
}

// Generate demo timeline events for a politician
function generateDemoTimelineEvents(politicianId: number): TimelineEvent[] {
  const topics = ["Healthcare", "Energy", "Technology", "Finance", "Environment", "Defense"];
  const baseYear = 2024;
  
  const events: TimelineEvent[] = [];
  let eventId = 1;
  
  // Generate events based on politician ID (for variety)
  const seed = politicianId * 7;
  
  // Healthcare cluster - votes and donations close together
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-01-15`,
    title: "Affordable Care Act Extension",
    outcome: politicianId % 2 === 1 ? "yes" : "no",
    topic: "Healthcare",
    citations: [
      { source_id: "congress-1", source_type: "congressional_record", source_url: "https://congress.gov/bill/123", title: "H.R. 1234 - ACA Extension", publisher: "Congress.gov" },
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
      { source_id: "fec-1", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q1 2024", publisher: "FEC.gov" },
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
      { source_id: "press-1", source_type: "press_release", source_url: "https://example.com/press", title: "Statement on Healthcare", publisher: "Office Press" },
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
      { source_id: "congress-2", source_type: "congressional_record", source_url: "https://congress.gov/bill/456", title: "S. 456 - Clean Energy", publisher: "Congress.gov" },
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
      { source_id: "fec-2", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q1 2024", publisher: "FEC.gov" },
    ],
    citation_count: 1,
  });
  
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-02-28`,
    title: "Infrastructure Modernization Bill",
    outcome: politicianId % 3 === 0 ? "no" : "yes",
    topic: "Energy",
    citations: [
      { source_id: "congress-3", source_type: "congressional_record", source_url: "https://congress.gov/bill/789", title: "H.R. 789 - Infrastructure", publisher: "Congress.gov" },
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
      { source_id: "congress-4", source_type: "congressional_record", source_url: "https://congress.gov/bill/999", title: "S. 999 - Data Privacy", publisher: "Congress.gov" },
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
      { source_id: "fec-3", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q1 2024", publisher: "FEC.gov" },
    ],
    citation_count: 1,
  });
  
  // Finance cluster - multiple events
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-04-05`,
    title: "Banking Regulation Reform",
    outcome: politicianId % 2 === 0 ? "yes" : "no",
    topic: "Finance",
    citations: [
      { source_id: "congress-5", source_type: "congressional_record", source_url: "https://congress.gov/bill/111", title: "H.R. 111 - Banking Reform", publisher: "Congress.gov" },
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
      { source_id: "fec-4", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q2 2024", publisher: "FEC.gov" },
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
      { source_id: "news-1", source_type: "news_article", source_url: "https://example.com/news", title: "Op-Ed: Financial Markets", publisher: "Major Newspaper" },
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
      { source_id: "congress-6", source_type: "congressional_record", source_url: "https://congress.gov/bill/222", title: "Amendment to H.R. 111", publisher: "Congress.gov" },
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
      { source_id: "congress-7", source_type: "congressional_record", source_url: "https://congress.gov/bill/333", title: "S. 333 - Parks Protection", publisher: "Congress.gov" },
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
      { source_id: "fec-5", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q2 2024", publisher: "FEC.gov" },
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
      { source_id: "congress-8", source_type: "congressional_record", source_url: "https://congress.gov/bill/444", title: "NDAA FY2025", publisher: "Congress.gov" },
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
      { source_id: "fec-6", source_type: "fec_filing", source_url: "https://fec.gov/data/receipts", title: "FEC Filing Q2 2024", publisher: "FEC.gov" },
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
      { source_id: "press-2", source_type: "press_release", source_url: "https://example.com/press", title: "July 4th Statement", publisher: "Office Press" },
    ],
    citation_count: 1,
  });
  
  events.push({
    id: `evt-${politicianId}-${eventId++}`,
    type: "vote",
    date: `${baseYear}-08-15`,
    title: "Education Funding Amendment",
    outcome: politicianId % 2 === 1 ? "yes" : "no",
    topic: "Other",
    citations: [
      { source_id: "congress-9", source_type: "congressional_record", source_url: "https://congress.gov/bill/555", title: "Education Funding", publisher: "Congress.gov" },
    ],
    citation_count: 1,
  });
  
  return events;
}

export async function getNetworkGraph(params?: {
  politician_ids?: number[];
  include_indirect?: boolean;
}): Promise<NetworkGraphResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      nodes: [],
      edges: [],
    };
  }

  const queryParams = new URLSearchParams();
  if (params?.politician_ids) {
    params.politician_ids.forEach((id) => queryParams.append("politician_ids", id.toString()));
  }
  if (params?.include_indirect !== undefined) {
    queryParams.append("include_indirect", params.include_indirect.toString());
  }

  return fetchApi<NetworkGraphResponse>(
    `/api/visualizations/network-graph${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
}

export async function getPoliticianRadial(
  politicianId: number,
  params?: {
    start_date?: string;
    end_date?: string;
  }
): Promise<RadialResponse> {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      categories: [],
      total_amount: 0,
      total_count: 0,
    };
  }

  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append("start_date", params.start_date);
  if (params?.end_date) queryParams.append("end_date", params.end_date);

  return fetchApi<RadialResponse>(
    `/api/visualizations/politician-radial/${politicianId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`
  );
}

// Helper to check if we're in demo mode
export function isDemoMode(): boolean {
  return DEMO_MODE;
}
