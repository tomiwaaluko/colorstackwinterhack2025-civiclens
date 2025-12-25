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
  office?: string;
  state?: string;
  district?: string;
  photo_url?: string;
  bio?: string;
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

// Demo/offline mode data
export interface DemoData {
  politicians: Politician[];
  profiles: Record<string, PoliticianProfile>;
}

