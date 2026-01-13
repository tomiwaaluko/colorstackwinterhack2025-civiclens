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

// Revalidate data every hour
export const revalidate = 3600;

// Helper to create response with caching headers
function createCachedResponse(data: any) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const politicianIds = searchParams.getAll("politician_ids");
  const minAmount = parseInt(searchParams.get("min_amount") || "0", 10);
  const category = searchParams.get("category");

  try {
    // Try to fetch real data from Supabase
    const hasPoliticianFilter = politicianIds.length > 0;

    // Fetch politicians
    let politiciansQuery = supabase
      .from("politicians")
      .select("id, full_name, party");

    if (hasPoliticianFilter) {
      politiciansQuery = politiciansQuery.in("id", politicianIds);
    }

    const { data: politicians, error: polError } = await politiciansQuery;

    if (polError || !politicians || politicians.length === 0) {
      return createCachedResponse(
        generateDemoNetworkGraph(
          politicianIds.map((id) => parseInt(id, 10)),
          minAmount,
          category
        )
      );
    }

    // Fetch donations for these politicians
    let donationsQuery = supabase.from("donations").select("*");

    if (hasPoliticianFilter) {
      donationsQuery = donationsQuery.in("politician_id", politicianIds);
    }
    if (minAmount > 0) {
      donationsQuery = donationsQuery.gte("amount", minAmount);
    }
    if (category) {
      donationsQuery = donationsQuery.eq("category", category);
    }

    const { data: donations, error: donationsError } = await donationsQuery;

    if (donationsError) {
      console.error(
        "Error fetching donations for network graph:",
        donationsError
      );
    }

    // Build network graph
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeIds = new Set<string>();

    // Add politician nodes
    politicians.forEach((pol: any) => {
      const nodeId = `pol-${pol.id}`;
      if (!nodeIds.has(nodeId)) {
        nodeIds.add(nodeId);
        nodes.push({
          id: nodeId,
          label: pol.full_name || pol.name,
          type: "politician",
          party: pol.party,
          metadata: { party: pol.party },
        });
      }
    });

    // Add donor nodes and donation edges
    if (donations && donations.length > 0) {
      const donorTotals: Record<
        string,
        { name: string; amount: number; category: string }
      > = {};
      const pendingEdges: Array<{
        donorId: string;
        politicianId: string;
        amount: number;
        category: string;
      }> = [];

      // First pass: calculate donor totals and collect pending edges
      donations.forEach((donation: any) => {
        const donorName = donation.donor_name || "Unknown Donor";
        const donorId = `donor-${donorName.replace(/\s+/g, "-").toLowerCase()}`;

        if (!donorTotals[donorId]) {
          donorTotals[donorId] = {
            name: donorName,
            amount: 0,
            category: donation.category || "Other",
          };
        }
        donorTotals[donorId].amount += donation.amount || 0;

        // Collect edge for later (will filter by minAmount)
        pendingEdges.push({
          donorId,
          politicianId: `pol-${donation.politician_id}`,
          amount: donation.amount || 0,
          category: donation.category || "Other",
        });
      });

      // Build set of valid donor IDs (those meeting minAmount threshold)
      const validDonorIds = new Set<string>();
      Object.entries(donorTotals).forEach(([donorId, data]) => {
        if (data.amount >= minAmount) {
          validDonorIds.add(donorId);
        }
      });

      // Add donor nodes (only those meeting threshold)
      Object.entries(donorTotals).forEach(([donorId, data]) => {
        if (!nodeIds.has(donorId) && validDonorIds.has(donorId)) {
          nodeIds.add(donorId);
          nodes.push({
            id: donorId,
            label: data.name,
            type: "donor",
            category: data.category,
            amount: data.amount,
            metadata: { category: data.category, total_amount: data.amount },
          });
        }
      });

      // Add edges only for donors meeting the threshold
      pendingEdges.forEach((edge) => {
        if (validDonorIds.has(edge.donorId)) {
          edges.push({
            source: edge.donorId,
            target: edge.politicianId,
            type: "donation",
            weight: edge.amount,
            category: edge.category,
            metadata: { amount: edge.amount, category: edge.category },
          });
        }
      });
    }

    // If we have very few nodes, return demo data
    if (nodes.length < 3) {
      return createCachedResponse(
        generateDemoNetworkGraph(
          politicianIds.map((id) => parseInt(id, 10)),
          minAmount,
          category
        )
      );
    }

    // Generate clusters by category
    const categories = [
      ...new Set(nodes.filter((n) => n.category).map((n) => n.category)),
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
      node_ids: nodes.filter((n) => n.category === cat).map((n) => n.id),
      color: categoryColors[cat] || "#9ca3af",
    }));

    return createCachedResponse({ nodes, edges, clusters });
  } catch (error) {
    console.error("Error fetching network graph data:", error);
    return createCachedResponse(
      generateDemoNetworkGraph(
        politicianIds.map((id) => parseInt(id, 10)),
        minAmount,
        category
      )
    );
  }
}

function generateDemoNetworkGraph(
  politicianIds?: number[],
  minAmount?: number,
  category?: string | null
) {
  const nodes: any[] = [];
  const edges: any[] = [];

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
  const donors = [
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
      id: "donor-tech",
      name: "TechNet",
      category: "Technology",
      amount: 175000,
    },
    {
      id: "donor-defense",
      name: "Defense Contractors PAC",
      category: "Defense",
      amount: 220000,
    },
  ];

  // Bills by category
  const bills = [
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
    { id: "bill-bank", name: "Banking Regulation Reform", category: "Finance" },
    {
      id: "bill-privacy",
      name: "Data Privacy Protection Act",
      category: "Technology",
    },
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

  // Create donation edges
  activePoliticians.forEach((pol) => {
    const seed = pol.id * 17;
    amountFilteredDonors.forEach((donor, idx) => {
      const baseAmount = Math.floor(donor.amount / (3 + (seed % 3)));
      const variation = ((seed + idx) % 5) * 1000;
      const donationAmount = baseAmount + variation;

      if ((seed + idx) % 3 !== 0) {
        edges.push({
          source: donor.id,
          target: `pol-${pol.id}`,
          type: "donation",
          weight: donationAmount,
          category: donor.category,
          metadata: { amount: donationAmount, category: donor.category },
        });
      }
    });
  });

  // Create vote edges
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

  // Generate clusters
  const categories = [
    ...new Set([
      ...amountFilteredDonors.map((d) => d.category),
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
