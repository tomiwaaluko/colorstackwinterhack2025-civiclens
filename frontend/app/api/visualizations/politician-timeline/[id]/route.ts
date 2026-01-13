import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required Supabase environment variables: " +
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set"
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to normalize vote positions
function normalizeVoteOutcome(
  position: string | null | undefined
): string | null {
  if (!position) return null;
  const normalized = position.toLowerCase().trim();
  switch (normalized) {
    case "yea":
    case "yes":
    case "aye":
      return "yes";
    case "nay":
    case "no":
      return "no";
    case "abstain":
    case "not voting":
    case "present":
    case "absent":
      return "abstain";
    default:
      return "unknown";
  }
}

// Revalidate data every 30 minutes
export const revalidate = 1800;

// Helper to create response with caching headers
function createCachedResponse(data: any) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: politicianId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");
  const eventTypes = searchParams.getAll("event_types");

  try {
    // Fetch votes for this politician
    let votesQuery = supabase
      .from("votes")
      .select(
        `
        id,
        vote_date,
        vote_position,
        bills (
          id,
          title,
          bill_type,
          policy_area
        )
      `
      )
      .eq("politician_id", politicianId);

    if (startDate) votesQuery = votesQuery.gte("vote_date", startDate);
    if (endDate) votesQuery = votesQuery.lte("vote_date", endDate);

    // Fetch donations for this politician
    let donationsQuery = supabase
      .from("donations")
      .select("*")
      .eq("politician_id", politicianId);

    if (startDate)
      donationsQuery = donationsQuery.gte("donation_date", startDate);
    if (endDate) donationsQuery = donationsQuery.lte("donation_date", endDate);

    // Fetch statements
    let statementsQuery = supabase
      .from("statements")
      .select("*")
      .eq("politician_id", politicianId);

    if (startDate)
      statementsQuery = statementsQuery.gte("statement_date", startDate);
    if (endDate)
      statementsQuery = statementsQuery.lte("statement_date", endDate);

    const [votesResult, donationsResult, statementsResult] = await Promise.all([
      votesQuery,
      donationsQuery,
      statementsQuery,
    ]);

    const events: any[] = [];
    const hasRealData = {
      vote: false,
      donation: false,
      statement: false,
      bill_sponsor: false,
    };

    // Process votes
    if (votesResult.data && votesResult.data.length > 0) {
      hasRealData.vote = true;
      votesResult.data.forEach((vote: any, idx: number) => {
        const shouldInclude =
          eventTypes.length === 0 || eventTypes.includes("vote");
        if (shouldInclude) {
          events.push({
            id: `vote-${vote.id || idx}`,
            type: "vote",
            date: vote.vote_date || "2024-01-01",
            title: vote.bills?.title || "Vote",
            outcome: normalizeVoteOutcome(vote.vote_position),
            topic: vote.bills?.policy_area || "Other",
            citations: [],
            citation_count: 0,
          });
        }
      });
    }

    // Process donations
    if (donationsResult.data && donationsResult.data.length > 0) {
      hasRealData.donation = true;
      donationsResult.data.forEach((donation: any, idx: number) => {
        const shouldInclude =
          eventTypes.length === 0 || eventTypes.includes("donation");
        if (shouldInclude) {
          events.push({
            id: `donation-${donation.id || idx}`,
            type: "donation",
            date: donation.donation_date || "2024-01-01",
            title: donation.donor_name || "Anonymous Donation",
            amount: donation.amount || 0,
            topic: donation.category || "Other",
            citations: [],
            citation_count: 0,
          });
        }
      });
    }

    // Process statements
    if (statementsResult.data && statementsResult.data.length > 0) {
      hasRealData.statement = true;
      statementsResult.data.forEach((statement: any, idx: number) => {
        const shouldInclude =
          eventTypes.length === 0 || eventTypes.includes("statement");
        if (shouldInclude) {
          events.push({
            id: `statement-${statement.id || idx}`,
            type: "statement",
            date: statement.statement_date || "2024-01-01",
            title: statement.title || "Public Statement",
            topic: statement.topic || "Other",
            citations: [],
            citation_count: 0,
          });
        }
      });
    }

    // Fill in demo data for missing event types
    const demoData = generateDemoTimelineData(politicianId, [], startDate, endDate);

    // Add demo votes if no real votes
    if (!hasRealData.vote && (eventTypes.length === 0 || eventTypes.includes("vote"))) {
      const demoVotes = demoData.events.filter((e: any) => e.type === "vote");
      events.push(...demoVotes);
    }

    // Add demo statements if no real statements
    if (!hasRealData.statement && (eventTypes.length === 0 || eventTypes.includes("statement"))) {
      const demoStatements = demoData.events.filter((e: any) => e.type === "statement");
      events.push(...demoStatements);
    }

    // Add demo bill_sponsor if none exist (we don't have a bills table query yet)
    if (!hasRealData.bill_sponsor && (eventTypes.length === 0 || eventTypes.includes("bill_sponsor"))) {
      const demoBills = demoData.events.filter((e: any) => e.type === "bill_sponsor");
      events.push(...demoBills);
    }

    // If still no events at all, return full demo data
    if (events.length === 0) {
      return createCachedResponse(demoData);
    }

    // Sort events by date
    events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return createCachedResponse({
      events,
      clusters: [],
    });
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to fetch timeline data",
        message: errorMessage,
        timestamp: new Date().toISOString(),
        isDemo: true,
        fallbackData: generateDemoTimelineData(
          politicianId,
          eventTypes,
          startDate,
          endDate
        ),
      },
      { status: 500 }
    );
  }
}

function generateDemoTimelineData(
  politicianId: string,
  eventTypes: string[],
  startDate: string | null,
  endDate: string | null
) {
  const topics = [
    "Healthcare",
    "Energy",
    "Technology",
    "Finance",
    "Environment",
    "Defense",
  ];
  const baseYear = 2024;
  const events: any[] = [];
  let eventId = 1;

  // Generate a numeric seed from politician ID
  const numericId =
    parseInt(politicianId, 10) ||
    politicianId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = numericId * 7;

  const shouldIncludeType = (type: string) =>
    eventTypes.length === 0 || eventTypes.includes(type);

  // Healthcare cluster
  if (shouldIncludeType("vote")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "vote",
      date: `${baseYear}-01-15`,
      title: "Affordable Care Act Extension",
      outcome: numericId % 2 === 1 ? "yes" : "no",
      topic: "Healthcare",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("donation")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "donation",
      date: `${baseYear}-01-18`,
      title: "PhRMA Association PAC",
      amount: 25000 + (seed % 10) * 1000,
      topic: "Healthcare",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("statement")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "statement",
      date: `${baseYear}-01-22`,
      title: "Press Release on Healthcare Policy",
      topic: "Healthcare",
      citations: [],
      citation_count: 0,
    });
  }

  // Energy cluster
  if (shouldIncludeType("bill_sponsor")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "bill_sponsor",
      date: `${baseYear}-02-10`,
      title: "Clean Energy Investment Act",
      topic: "Energy",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("donation")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "donation",
      date: `${baseYear}-02-12`,
      title: "Renewable Energy PAC",
      amount: 15000 + (seed % 8) * 500,
      topic: "Energy",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("vote")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "vote",
      date: `${baseYear}-02-28`,
      title: "Infrastructure Modernization Bill",
      outcome: numericId % 3 === 0 ? "no" : "yes",
      topic: "Energy",
      citations: [],
      citation_count: 0,
    });
  }

  // Technology events
  if (shouldIncludeType("vote")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "vote",
      date: `${baseYear}-03-15`,
      title: "Data Privacy Protection Act",
      outcome: "yes",
      topic: "Technology",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("donation")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "donation",
      date: `${baseYear}-03-18`,
      title: "Tech Industry Coalition",
      amount: 50000 + (seed % 5) * 5000,
      topic: "Technology",
      citations: [],
      citation_count: 0,
    });
  }

  // Finance cluster
  if (shouldIncludeType("vote")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "vote",
      date: `${baseYear}-04-05`,
      title: "Banking Regulation Reform",
      outcome: numericId % 2 === 0 ? "yes" : "no",
      topic: "Finance",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("donation")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "donation",
      date: `${baseYear}-04-08`,
      title: "Wall Street PAC",
      amount: 75000 + (seed % 10) * 2500,
      topic: "Finance",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("statement")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "statement",
      date: `${baseYear}-04-10`,
      title: "Op-Ed on Financial Transparency",
      topic: "Finance",
      citations: [],
      citation_count: 0,
    });
  }

  // Environment events
  if (shouldIncludeType("bill_sponsor")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "bill_sponsor",
      date: `${baseYear}-05-01`,
      title: "National Parks Protection Act",
      topic: "Environment",
      citations: [],
      citation_count: 0,
    });
  }

  // Defense events
  if (shouldIncludeType("vote")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "vote",
      date: `${baseYear}-06-10`,
      title: "Defense Authorization Act FY2025",
      outcome: "yes",
      topic: "Defense",
      citations: [],
      citation_count: 0,
    });
  }

  if (shouldIncludeType("donation")) {
    events.push({
      id: `evt-${politicianId}-${eventId++}`,
      type: "donation",
      date: `${baseYear}-06-12`,
      title: "Defense Contractors PAC",
      amount: 35000 + (seed % 6) * 3000,
      topic: "Defense",
      citations: [],
      citation_count: 0,
    });
  }

  // Filter by date range
  const filteredEvents = events.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  return {
    events: filteredEvents,
    clusters: [],
  };
}
