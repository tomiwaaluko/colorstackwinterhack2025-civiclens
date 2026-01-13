// Core data types matching backend API contracts

export interface Citation {
  source_id: string;
  url: string;
  title: string;
  publisher: string;
  retrieved_at: string;
  snippet?: string;
}

export interface Politician {
  id: string;
  name: string;
  party?: string;
  position?: string;  // 'President', 'Vice President', 'Senator', 'Representative', 'Governor', 'Other'
  state_code?: string;  // 2-letter USPS state code (e.g., 'CA', 'NY', 'DE')
  district_number?: number | null;  // Congressional district (1-53) or null for senators/presidents
  image_url?: string;  // URL to politician photo
  photo_url?: string;  // Legacy field, use image_url instead
  bio?: string;
  state_or_district?: string;  // Backend summary field (e.g., "CA-12" or "National")
  vote_count?: number;  // Search summary count
  statement_count?: number;  // Search summary count
  // Legacy fields for backward compatibility
  office?: string;  // Deprecated: use position instead
  state?: string;  // Deprecated: use state_code instead
  district?: string;  // Deprecated: use district_number instead
}

export interface Vote {
  id: string;
  bill_id?: string;
  bill_title?: string;
  vote_position: 'yes' | 'no' | 'abstain' | 'not_voting';
  vote_date: string;
  topic?: string;
  citations: Citation[];
}

export interface Donation {
  id: string;
  category: string;
  amount: number;
  donor_name?: string;
  date?: string;
  citations: Citation[];
}

export interface DonationAggregate {
  category: string;
  total_amount: number;
  citation_count: number;
  citations: Citation[];
}

export interface Statement {
  id: string;
  text: string;
  date?: string;
  source_type?: string;
  citations: Citation[];
}

export interface PoliticianDetails {
  statements: string[];
  votes: string[][];
}

export interface PoliticianSummaryResponse extends Politician {
  politician_details?: PoliticianDetails;
}

export interface SearchResult {
  politicians: Politician[];
  total?: number;
}

export interface PoliticianProfile {
  politician: Politician;
  votes?: Vote[];
  donations?: DonationAggregate[];
  statements?: Statement[];
  source_count?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  request_id?: string;
}

// Comparison types
export interface ComparisonRequest {
  politician_a_id: string;
  politician_b_id: string;
  topic?: string;
}

export interface ComparisonResult {
  politician_a: PoliticianProfile;
  politician_b: PoliticianProfile;
  topic?: string;
  comparison_summary?: string;
}

// Visualization types
export interface VisualizationCitation {
  source_id: number | string; // Can be number or string for flexibility
  source_url: string;
  title: string;
  publisher: string;
  retrieved_at: string;
  source_type?: string; // Optional source type for categorization
}

export interface StateDonationValue {
  total_amount: number;
  donation_count: number;
  avg_amount?: number | null;
  top_donor_category?: string | null;
  top_category_amount?: number | null;
  party_breakdown?: {
    democrat: number;
    republican: number;
    independent: number;
  };
  citations: VisualizationCitation[];
  top_politicians: Array<{
    politician_id: number;
    name: string;
    total_amount: number;
  }>;
  top_donors: Array<{
    donor_name: string;
    total_amount: number;
    donation_count: number;
  }>;
}

export interface DonationsMapResponse {
  level: string;
  values: Record<string, StateDonationValue>;
  metadata: {
    date_range: {
      start: string | null;
      end: string | null;
    };
    citation_count: number;
    total_states: number;
    filters: {
      politician_ids?: number[] | null;
      category?: string | null;
      start_date?: string | null;
      end_date?: string | null;
    };
  };
}

// Extended types for map visualization modes
export type MapViewMode = "total" | "party" | "comparative";

export interface PartyDonationValue {
  democrat: number;
  republican: number;
  independent: number;
  total: number;
}

export interface ComparativePoliticianData {
  id: number;
  name: string;
  party: string;
  color: string;
  values: Record<string, number>;
}

export type EventType = "vote" | "bill_sponsor" | "donation" | "statement";

export interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  outcome?: string | null;
  citations: VisualizationCitation[];
  citation_count: number;
  topic?: string;
  amount?: number; // For donation events
  related_events?: string[]; // IDs of related events
}

export interface TimelineCluster {
  id: string;
  name: string;
  topic: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  event_count: number;
}

export interface TimelineResponse {
  events: TimelineEvent[];
  clusters?: TimelineCluster[];
}

// Timeline comparative mode types
export interface ComparativeTimelineData {
  politician_id: number;
  politician_name: string;
  party: string;
  events: TimelineEvent[];
}

export interface TimelineComparisonResult {
  politicians: ComparativeTimelineData[];
  date_range: {
    start: string;
    end: string;
  };
}

export type NetworkNodeType = "politician" | "donor" | "bill";
export type NetworkEdgeType = "donation" | "vote" | "sponsor" | "indirect";

export interface NetworkNode {
  id: string;
  label: string;
  type: NetworkNodeType;
  metadata?: Record<string, any>;
  // Enhanced properties
  category?: string; // For clustering (e.g., "Healthcare", "Finance")
  party?: string; // For politicians
  amount?: number; // For donors (total donated)
  date?: string; // For time filtering
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  type: NetworkEdgeType;
  metadata?: Record<string, any>;
  // Enhanced properties
  date?: string;
  category?: string;
}

export interface NetworkCluster {
  id: string;
  name: string;
  category: string;
  node_ids: string[];
  color: string;
}

export interface NetworkGraphResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters?: NetworkCluster[];
}

// Exploration mode types
export type ExplorationMode = "default" | "influence_path" | "legislative_web";

export interface NetworkPath {
  nodes: string[];
  edges: Array<{ source: string; target: string }>;
  description: string;
}

export interface RelatedBill {
  id: string;
  title: string;
  vote_outcome?: "yes" | "no" | "abstain";
  sponsorship?: "primary" | "cosponsor" | null;
}

export interface CategoryValue {
  category: string;
  total_amount: number;
  donation_count: number;
  avg_amount?: number | null;
  citations: VisualizationCitation[];
  // Enhanced for multi-ring
  related_bills?: RelatedBill[];
  top_donors?: Array<{ name: string; amount: number }>;
}

export interface RadialResponse {
  categories: CategoryValue[];
  total_amount: number;
  total_count: number;
}

// Comparative radial types
export interface ComparativeRadialData {
  politician_id: number;
  politician_name: string;
  party: string;
  data: RadialResponse;
}

// Pathway animation types
export interface InfluencePathway {
  category: string;
  amount: number;
  bills: RelatedBill[];
  step: number; // Current animation step
}

// AI Q&A types (matching AI response schema)
export interface Claim {
  text: string;
  citations: string[]; // citation IDs
  confidence?: number;
}

export interface AIResponse {
  answer: string;
  claims: Claim[];
  citations: Citation[];
  limitations?: string;
  disclosure?: string;
}

export interface AskRequest {
  question: string;
  politician_ids?: string[];
  topic?: string;
}

// Demo/offline mode data
export interface DemoData {
  politicians: Politician[];
  profiles: Record<string, PoliticianProfile>;
  comparisons?: Record<string, ComparisonResult>;
  aiResponses?: Record<string, AIResponse>;
}
