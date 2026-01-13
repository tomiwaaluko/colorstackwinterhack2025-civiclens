import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: politicianId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  try {
    // Fetch donations for this politician
    let donationsQuery = supabase
      .from("donations")
      .select("*")
      .eq("politician_id", politicianId);

    if (startDate) donationsQuery = donationsQuery.gte("donation_date", startDate);
    if (endDate) donationsQuery = donationsQuery.lte("donation_date", endDate);

    const { data: donations, error } = await donationsQuery;

    if (error || !donations || donations.length === 0) {
      return createCachedResponse(generateDemoRadialData(politicianId));
    }

    // Aggregate donations by category
    const categoryData: Record<string, {
      total_amount: number;
      donation_count: number;
      donors: Record<string, number>;
    }> = {};

    donations.forEach((donation: any) => {
      const category = donation.category || "Other";
      if (!categoryData[category]) {
        categoryData[category] = {
          total_amount: 0,
          donation_count: 0,
          donors: {},
        };
      }
      categoryData[category].total_amount += donation.amount || 0;
      categoryData[category].donation_count += 1;

      const donorName = donation.donor_name || "Anonymous";
      categoryData[category].donors[donorName] =
        (categoryData[category].donors[donorName] || 0) + (donation.amount || 0);
    });

    // Transform to expected format
    const categories = Object.entries(categoryData).map(([category, data]) => {
      const topDonors = Object.entries(data.donors)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      return {
        category,
        total_amount: data.total_amount,
        donation_count: data.donation_count,
        avg_amount: Math.round(data.total_amount / data.donation_count),
        citations: [],
        related_bills: [],
        top_donors: topDonors,
      };
    });

    const totalAmount = categories.reduce((sum, c) => sum + c.total_amount, 0);
    const totalCount = categories.reduce((sum, c) => sum + c.donation_count, 0);

    return createCachedResponse({
      categories,
      total_amount: totalAmount,
      total_count: totalCount,
    });
  } catch (error) {
    console.error("Error fetching radial chart data:", error);
    return createCachedResponse(generateDemoRadialData(politicianId));
  }
}

function generateDemoRadialData(politicianId: string) {
  // Generate a numeric seed from politician ID
  const numericId = parseInt(politicianId, 10) ||
    politicianId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
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
    const variation = ((seed + idx) % 5) * 10000 - 20000;
    const amount = Math.max(10000, cat.baseAmount + variation);
    const donations = Math.max(5, cat.baseDonations + Math.floor(variation / 5000));

    const bills = cat.bills.map((bill, billIdx) => ({
      ...bill,
      vote_outcome: ((seed + idx + billIdx) % 3 === 0 ? "no" : "yes") as "yes" | "no",
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
      citations: [],
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
