import { createClient } from "@supabase/supabase-js";

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Politician {
  id: string;
  full_name: string;
  party: string | null;
  state: string | null;
  current_office: string | null;
  image_url: string | null;
}

// Fetch all politicians from Supabase
export async function fetchAllPoliticians(): Promise<
  Array<{ id: string; name: string; party: string }>
> {
  try {
    const { data, error } = await supabase
      .from("politicians")
      .select("id, full_name, party")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching politicians from Supabase:", error);
      throw error;
    }

    // Transform to match the expected format
    return (data || []).map((pol) => ({
      id: pol.id,
      name: pol.full_name,
      party: pol.party || "Unknown",
    }));
  } catch (error) {
    console.error("Failed to fetch politicians:", error);
    throw error;
  }
}
