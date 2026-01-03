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

// Helper to check if we're in demo mode
export function isDemoMode(): boolean {
  return DEMO_MODE;
}
