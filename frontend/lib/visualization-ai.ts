/**
 * Visualization AI API helpers
 *
 * Provides functions to interact with the visualization AI endpoints
 * for insights, Q&A, and suggestions.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Types

export type VisualizationType =
  | "donations_map"
  | "timeline"
  | "network_graph"
  | "radial_chart";

export type InsightType =
  | "key_finding"
  | "comparison"
  | "trend"
  | "concentration"
  | "pattern_alert";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  data_points: string[];
  confidence: ConfidenceLevel;
}

export interface InsightsResponse {
  insights: Insight[];
  summary: string;
  suggested_action?: string;
}

export interface SupportingData {
  label: string;
  value: string;
  context?: string;
}

export interface VisualizationQAResponse {
  answer: string;
  supporting_data: SupportingData[];
  follow_up_suggestions: string[];
  confidence: ConfidenceLevel;
  limitations?: string;
}

export type SuggestionActionType =
  | "filter"
  | "compare"
  | "timerange"
  | "switch_view"
  | "drill_down";

export interface SuggestionAction {
  type: SuggestionActionType;
  params: Record<string, unknown>;
}

export type SuggestionCategory =
  | "trending"
  | "comparison"
  | "money"
  | "voting"
  | "discovery";

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  action: SuggestionAction;
  difficulty: "easy" | "medium" | "advanced";
  estimated_time: string;
  category: SuggestionCategory;
}

export interface SuggestionsResponse {
  suggestions: AISuggestion[];
}

export interface AIStatusResponse {
  available: boolean;
  model: string;
}

// Request types

export interface InsightsRequest {
  visualization_type: VisualizationType;
  filters: Record<string, unknown>;
  data_summary: Record<string, unknown>;
  selected_items: string[];
}

export interface QARequest {
  question: string;
  visualization_type: VisualizationType;
  filters: Record<string, unknown>;
  data_summary: Record<string, unknown>;
  selected_items: string[];
}

export interface SuggestionsRequest {
  visualization_type: VisualizationType;
  current_state: Record<string, unknown>;
  user_history: string[];
}

// Demo data for offline mode

const DEMO_INSIGHTS: InsightsResponse = {
  insights: [
    {
      type: "key_finding",
      title: "California leads in donations",
      description:
        "California accounts for 28% of total donations in the current view, making it the highest-contributing state.",
      data_points: ["$2.4M total", "28% of total"],
      confidence: "high",
    },
    {
      type: "comparison",
      title: "Healthcare vs Energy sector split",
      description:
        "Healthcare donations are 40% higher than Energy sector donations across all states shown.",
      data_points: ["Healthcare: $1.8M", "Energy: $1.3M"],
      confidence: "medium",
    },
    {
      type: "trend",
      title: "2024 showing growth",
      description:
        "Donations in 2024 are trending 15% higher than the same period in 2023.",
      data_points: ["2024: $3.2M", "2023: $2.8M"],
      confidence: "medium",
    },
  ],
  summary:
    "The map shows concentrated donation activity in coastal states, with California and New York leading.",
  suggested_action:
    "Try filtering by Healthcare to see which states receive the most healthcare-related donations.",
};

const DEMO_QA_RESPONSE: VisualizationQAResponse = {
  answer:
    "Based on the current visualization, California has the highest total donations at $2.4 million, followed by New York at $1.8 million and Texas at $1.2 million.",
  supporting_data: [
    {
      label: "California",
      value: "$2,400,000",
      context: "Highest donations",
    },
    {
      label: "New York",
      value: "$1,800,000",
      context: "Second highest",
    },
    {
      label: "Texas",
      value: "$1,200,000",
      context: "Third highest",
    },
  ],
  follow_up_suggestions: [
    "Which industry contributes the most in California?",
    "How do donations compare between election years?",
    "What percentage of donations go to Democrats vs Republicans?",
  ],
  confidence: "high",
  limitations:
    "This data represents aggregated donations and may not include all sources.",
};

const DEMO_SUGGESTIONS: SuggestionsResponse = {
  suggestions: [
    {
      id: "compare-parties",
      title: "Compare donations by party",
      description:
        "Switch to party view to see how donations split between Democrats and Republicans.",
      action: {
        type: "filter",
        params: { viewMode: "party" },
      },
      difficulty: "easy",
      estimated_time: "30 seconds",
      category: "comparison",
    },
    {
      id: "healthcare-filter",
      title: "Focus on Healthcare donations",
      description:
        "Filter to Healthcare category to identify top states and donors in this sector.",
      action: {
        type: "filter",
        params: { category: "Healthcare" },
      },
      difficulty: "easy",
      estimated_time: "1 minute",
      category: "money",
    },
    {
      id: "time-animation",
      title: "Animate donation changes over time",
      description:
        "Use the time slider to see how donation patterns shifted from 2022 to 2024.",
      action: {
        type: "timerange",
        params: { animate: true },
      },
      difficulty: "medium",
      estimated_time: "2 minutes",
      category: "trending",
    },
  ],
};

// API functions

/**
 * Check if visualization AI features are available.
 */
export async function checkAIStatus(): Promise<AIStatusResponse> {
  if (DEMO_MODE) {
    return { available: true, model: "demo-mode" };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/visualizations/ai/status`
    );
    if (!response.ok) {
      return { available: false, model: "unavailable" };
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to check AI status:", error);
    return { available: false, model: "unavailable" };
  }
}

/**
 * Generate AI insights for the current visualization.
 */
export async function getVisualizationInsights(
  request: InsightsRequest
): Promise<InsightsResponse> {
  if (DEMO_MODE) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return DEMO_INSIGHTS;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/visualizations/ai/insights`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get visualization insights:", error);
    // Return demo insights as fallback
    return DEMO_INSIGHTS;
  }
}

/**
 * Ask a question about the current visualization.
 */
export async function askAboutVisualization(
  request: QARequest
): Promise<VisualizationQAResponse> {
  if (DEMO_MODE) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return DEMO_QA_RESPONSE;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/visualizations/ai/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to ask about visualization:", error);
    // Return demo response as fallback
    return DEMO_QA_RESPONSE;
  }
}

/**
 * Get AI-powered exploration suggestions.
 */
export async function getVisualizationSuggestions(
  request: SuggestionsRequest
): Promise<SuggestionsResponse> {
  if (DEMO_MODE) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    return DEMO_SUGGESTIONS;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/visualizations/ai/suggestions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get visualization suggestions:", error);
    // Return demo suggestions as fallback
    return DEMO_SUGGESTIONS;
  }
}
