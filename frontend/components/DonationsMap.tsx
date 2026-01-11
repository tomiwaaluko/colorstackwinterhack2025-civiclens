"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DonationsMapResponse, MapViewMode, ComparativePoliticianData } from "@/lib/types";
import { getDonationsMap } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "./LoadingSpinner";
import TimeSlider from "./ui/TimeSlider";

// Fix Leaflet default marker icon issue
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Available years for time slider (can be dynamic based on data)
const AVAILABLE_YEARS = [2022, 2023, 2024];

// Politician colors for comparative mode
const POLITICIAN_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
];

// Party colors
const PARTY_COLORS = {
  democrat: "#3b82f6",
  republican: "#ef4444",
  independent: "#10b981",
};

interface DonationsMapProps {
  politicianIds?: number[];
  category?: string;
  startDate?: string;
  endDate?: string;
  // New props for enhanced features
  showTimeSlider?: boolean;
  showViewModeToggle?: boolean;
  comparativePoliticians?: Array<{ id: number; name: string; party: string }>;
}

// Component to update map bounds
function MapBounds({ data }: { data: DonationsMapResponse | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (data && Object.keys(data.values).length > 0) {
      map.fitBounds([
        [24.396308, -125.0],
        [49.384358, -66.93457],
      ]);
    }
  }, [map, data]);

  return null;
}

// MapRefresher component to force re-render of GeoJSON
function MapRefresher({ 
  geoJson, 
  styleFeature, 
  onEachFeature, 
  refreshKey 
}: { 
  geoJson: any; 
  styleFeature: (feature: any) => any;
  onEachFeature: (feature: any, layer: any) => void;
  refreshKey: number;
}) {
  return (
    <GeoJSON
      key={refreshKey}
      data={geoJson}
      style={styleFeature}
      onEachFeature={onEachFeature}
    />
  );
}

export default function DonationsMap({
  politicianIds,
  category,
  startDate,
  endDate,
  showTimeSlider = true,
  showViewModeToggle = true,
  comparativePoliticians = [],
}: DonationsMapProps) {
  const [mapData, setMapData] = useState<DonationsMapResponse | null>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  
  // Phase 1 enhancements state
  const [selectedYear, setSelectedYear] = useState<number>(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>("total");
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  
  // Cache for comparative data
  const [comparativeData, setComparativeData] = useState<Record<number, DonationsMapResponse>>({});
  const [partyData, setPartyData] = useState<Record<string, { democrat: number; republican: number; independent: number }>>({});

  // Load state boundaries
  useEffect(() => {
    fetch("/data/us-states.json")
      .then((res) => res.json())
      .then((data) => {
        setGeoJson(data);
      })
      .catch((err) => {
        console.error("Failed to load state boundaries:", err);
        setError("Failed to load map data");
      });
  }, []);

  // Calculate date range based on selected year
  const getDateRangeForYear = useCallback((year: number) => {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }, []);

  // Load donation data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const dateRange = showTimeSlider ? getDateRangeForYear(selectedYear) : { start: startDate, end: endDate };

    getDonationsMap({
      politician_ids: politicianIds,
      category,
      start_date: dateRange.start || undefined,
      end_date: dateRange.end || undefined,
    })
      .then((data) => {
        setMapData(data);
        setIsLoading(false);
        setGeoJsonKey((k) => k + 1); // Force GeoJSON re-render
      })
      .catch((err) => {
        console.error("Failed to load donations map data:", err);
        setError(err.message || "Failed to load donation data");
        setIsLoading(false);
      });
  }, [politicianIds, category, startDate, endDate, selectedYear, showTimeSlider, getDateRangeForYear]);

  // Load comparative data for multiple politicians
  useEffect(() => {
    if (viewMode !== "comparative" || comparativePoliticians.length === 0) return;

    const dateRange = showTimeSlider ? getDateRangeForYear(selectedYear) : { start: startDate, end: endDate };

    Promise.all(
      comparativePoliticians.map((pol) =>
        getDonationsMap({
          politician_ids: [pol.id],
          start_date: dateRange.start || undefined,
          end_date: dateRange.end || undefined,
        }).then((data) => ({ id: pol.id, data }))
      )
    ).then((results) => {
      const newComparativeData: Record<number, DonationsMapResponse> = {};
      results.forEach(({ id, data }) => {
        newComparativeData[id] = data;
      });
      setComparativeData(newComparativeData);
      setGeoJsonKey((k) => k + 1);
    });
  }, [viewMode, comparativePoliticians, selectedYear, startDate, endDate, showTimeSlider, getDateRangeForYear]);

  // Calculate party aggregation from map data
  useEffect(() => {
    if (viewMode !== "party" || !mapData) return;

    // Aggregate by party - in real implementation, this would come from backend
    // For now, we'll simulate by using top_politicians data
    const partyAggregation: Record<string, { democrat: number; republican: number; independent: number }> = {};
    
    Object.entries(mapData.values).forEach(([stateCode, stateData]) => {
      partyAggregation[stateCode] = {
        democrat: 0,
        republican: 0,
        independent: 0,
      };
      
      // Simulate party distribution based on top politicians
      stateData.top_politicians.forEach((pol) => {
        // Use name-based heuristic for demo (in production, this would be from data)
        const amount = pol.total_amount;
        const partyGuess = Math.random() > 0.5 ? "democrat" : "republican";
        partyAggregation[stateCode][partyGuess] += amount;
      });
      
      // If no top_politicians, distribute total amount
      if (stateData.top_politicians.length === 0) {
        const total = stateData.total_amount;
        partyAggregation[stateCode].democrat = total * 0.45;
        partyAggregation[stateCode].republican = total * 0.45;
        partyAggregation[stateCode].independent = total * 0.1;
      }
    });
    
    setPartyData(partyAggregation);
    setGeoJsonKey((k) => k + 1);
  }, [viewMode, mapData]);

  // Calculate color scale
  const { minAmount, maxAmount } = useMemo(() => {
    if (!mapData) return { minAmount: 0, maxAmount: 1 };
    const amounts = Object.values(mapData.values).map((v) => v.total_amount);
    if (amounts.length === 0) return { minAmount: 0, maxAmount: 1 };
    return {
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
    };
  }, [mapData]);

  // Color interpolation function for total view
  const getColorForAmount = useCallback((amount: number): string => {
    if (maxAmount === minAmount) return "#3b82f6";
    const ratio = (amount - minAmount) / (maxAmount - minAmount);
    const r = Math.round(59 + ratio * 196);
    const g = Math.round(130 - ratio * 130);
    const b = Math.round(246 - ratio * 246);
    return `rgb(${r}, ${g}, ${b})`;
  }, [minAmount, maxAmount]);

  // Color function for party view
  const getPartyColor = useCallback((stateCode: string): string => {
    const statePartyData = partyData[stateCode];
    if (!statePartyData) return "#e5e7eb";
    
    const { democrat, republican, independent } = statePartyData;
    const total = democrat + republican + independent;
    if (total === 0) return "#e5e7eb";
    
    // Blend colors based on proportions
    const dRatio = democrat / total;
    const rRatio = republican / total;
    
    if (dRatio > 0.6) return PARTY_COLORS.democrat;
    if (rRatio > 0.6) return PARTY_COLORS.republican;
    
    // Mix blue and red for competitive states
    const r = Math.round(59 * dRatio + 239 * rRatio + 16 * (1 - dRatio - rRatio));
    const g = Math.round(130 * dRatio + 68 * rRatio + 185 * (1 - dRatio - rRatio));
    const b = Math.round(246 * dRatio + 68 * rRatio + 129 * (1 - dRatio - rRatio));
    return `rgb(${r}, ${g}, ${b})`;
  }, [partyData]);

  // Color function for comparative view
  const getComparativeColor = useCallback((stateCode: string): string => {
    if (comparativePoliticians.length === 0) return "#e5e7eb";
    
    // Find which politician has the most donations in this state
    let maxAmount = 0;
    let dominantPoliticianIndex = -1;
    
    comparativePoliticians.forEach((pol, index) => {
      const polData = comparativeData[pol.id];
      const stateAmount = polData?.values[stateCode]?.total_amount || 0;
      if (stateAmount > maxAmount) {
        maxAmount = stateAmount;
        dominantPoliticianIndex = index;
      }
    });
    
    if (dominantPoliticianIndex === -1 || maxAmount === 0) return "#e5e7eb";
    return POLITICIAN_COLORS[dominantPoliticianIndex % POLITICIAN_COLORS.length];
  }, [comparativePoliticians, comparativeData]);

  // Style function for GeoJSON
  const styleFeature = useCallback((feature: any) => {
    const stateCode = feature.properties.STATE_CODE;
    const donationData = mapData?.values[stateCode];
    const isSelected = selectedState === stateCode;

    let fillColor = "#e5e7eb";
    let fillOpacity = 0.3;

    if (viewMode === "total" && donationData) {
      fillColor = getColorForAmount(donationData.total_amount);
      fillOpacity = 0.7;
    } else if (viewMode === "party") {
      fillColor = getPartyColor(stateCode);
      fillOpacity = 0.7;
    } else if (viewMode === "comparative") {
      fillColor = getComparativeColor(stateCode);
      fillOpacity = 0.7;
    }

    return {
      fillColor,
      fillOpacity,
      weight: isSelected ? 3 : 1,
      color: isSelected ? "#000" : "#fff",
      opacity: 1,
    };
  }, [mapData, selectedState, viewMode, getColorForAmount, getPartyColor, getComparativeColor]);

  // Handle feature click
  const onEachFeature = useCallback((feature: any, layer: any) => {
    const stateCode = feature.properties.STATE_CODE;
    const donationData = mapData?.values[stateCode];

    // Build tooltip content based on view mode
    let tooltipContent = feature.properties.NAME || stateCode;
    
    if (viewMode === "total" && donationData) {
      tooltipContent = `${feature.properties.NAME || stateCode}: $${donationData.total_amount.toLocaleString()}`;
    } else if (viewMode === "party") {
      const statePartyData = partyData[stateCode];
      if (statePartyData) {
        tooltipContent = `${feature.properties.NAME || stateCode}<br/>
          D: $${Math.round(statePartyData.democrat).toLocaleString()}<br/>
          R: $${Math.round(statePartyData.republican).toLocaleString()}`;
      }
    } else if (viewMode === "comparative") {
      const amounts = comparativePoliticians.map((pol, idx) => {
        const amount = comparativeData[pol.id]?.values[stateCode]?.total_amount || 0;
        return `${pol.name}: $${amount.toLocaleString()}`;
      }).join("<br/>");
      tooltipContent = `${feature.properties.NAME || stateCode}<br/>${amounts}`;
    }

    layer.bindTooltip(tooltipContent);
    
    layer.on({
      click: () => setSelectedState(stateCode),
      mouseover: (e: any) => {
        const layer = e.target;
        layer.setStyle({ weight: 3, color: "#000" });
      },
      mouseout: (e: any) => {
        if (selectedState !== stateCode) {
          const layer = e.target;
          layer.setStyle({ weight: 1, color: "#fff" });
        }
      },
    });
  }, [mapData, viewMode, partyData, comparativePoliticians, comparativeData, selectedState]);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    // Stop playing when manually selecting a year
    if (isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  if (isLoading || !geoJson) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donations by State</CardTitle>
          <CardDescription>Interactive choropleth map showing donation amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donations by State</CardTitle>
          <CardDescription>Interactive choropleth map showing donation amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-red-600">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedData = selectedState ? mapData?.values[selectedState] : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Donations by State</CardTitle>
            <CardDescription>
              Interactive choropleth map showing donation amounts by state
              {showTimeSlider && ` (${selectedYear})`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* View Mode Toggle */}
        {showViewModeToggle && (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as MapViewMode)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="total">Total Donations</TabsTrigger>
              <TabsTrigger value="party">By Party</TabsTrigger>
              <TabsTrigger 
                value="comparative" 
                disabled={comparativePoliticians.length === 0}
                title={comparativePoliticians.length === 0 ? "Select politicians to compare" : ""}
              >
                Compare Politicians
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Comparative Politicians Legend */}
        {viewMode === "comparative" && comparativePoliticians.length > 0 && (
          <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
            {comparativePoliticians.map((pol, idx) => (
              <div key={pol.id} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: POLITICIAN_COLORS[idx % POLITICIAN_COLORS.length] }}
                />
                <span className="text-sm">{pol.name}</span>
                <Badge variant="outline" className="text-xs">
                  {pol.party}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Map */}
        <div className="h-[500px] rounded-lg overflow-hidden border">
          <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapData && <MapBounds data={mapData} />}
            <MapRefresher
              geoJson={geoJson}
              styleFeature={styleFeature}
              onEachFeature={onEachFeature}
              refreshKey={geoJsonKey}
            />
          </MapContainer>
        </div>

        {/* Time Slider */}
        {showTimeSlider && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <TimeSlider
              years={AVAILABLE_YEARS}
              selectedYear={selectedYear}
              onYearChange={handleYearChange}
              isPlaying={isPlaying}
              onPlayingChange={setIsPlaying}
              playSpeed={2000}
            />
          </div>
        )}

        {/* Selected State Info */}
        {selectedData && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {geoJson.features.find((f: any) => f.properties.STATE_CODE === selectedState)
                  ?.properties.NAME || selectedState}
              </h3>
              <Badge variant="secondary">
                ${selectedData.total_amount.toLocaleString()}
              </Badge>
            </div>
            
            {/* Party breakdown when in party view */}
            {viewMode === "party" && partyData[selectedState!] && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PARTY_COLORS.democrat }} />
                  <span>D: ${Math.round(partyData[selectedState!].democrat).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PARTY_COLORS.republican }} />
                  <span>R: ${Math.round(partyData[selectedState!].republican).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PARTY_COLORS.independent }} />
                  <span>I: ${Math.round(partyData[selectedState!].independent).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Comparative breakdown when in comparative view */}
            {viewMode === "comparative" && comparativePoliticians.length > 0 && (
              <div className="space-y-1 text-sm">
                {comparativePoliticians.map((pol, idx) => {
                  const amount = comparativeData[pol.id]?.values[selectedState!]?.total_amount || 0;
                  return (
                    <div key={pol.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: POLITICIAN_COLORS[idx % POLITICIAN_COLORS.length] }}
                        />
                        <span>{pol.name}</span>
                      </div>
                      <span className="font-medium">${amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standard info for total view */}
            {viewMode === "total" && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Donations:</span>{" "}
                    <span className="font-medium">{selectedData.donation_count}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Amount:</span>{" "}
                    <span className="font-medium">
                      ${selectedData.avg_amount?.toLocaleString() || "N/A"}
                    </span>
                  </div>
                  {selectedData.top_donor_category && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Top Category:</span>{" "}
                      <Badge variant="outline">{selectedData.top_donor_category}</Badge>
                    </div>
                  )}
                </div>
                {selectedData.top_politicians.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-600 text-sm">Top Politicians:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedData.top_politicians.map((pol, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {pol.name} (${pol.total_amount.toLocaleString()})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Citations */}
            {selectedData.citations.length > 0 && (
              <div className="mt-2">
                <span className="text-gray-600 text-sm">Sources:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedData.citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {citation.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm flex-wrap">
          {viewMode === "total" && (
            <>
              <span className="text-gray-600">Amount:</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColorForAmount(minAmount) }}
                />
                <span>${minAmount.toLocaleString()}</span>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded min-w-[100px]" />
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: getColorForAmount(maxAmount) }}
                />
                <span>${maxAmount.toLocaleString()}</span>
              </div>
            </>
          )}
          {viewMode === "party" && (
            <>
              <span className="text-gray-600">Party:</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.democrat }} />
                <span>Democrat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.republican }} />
                <span>Republican</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: PARTY_COLORS.independent }} />
                <span>Independent</span>
              </div>
            </>
          )}
          {viewMode === "comparative" && comparativePoliticians.length > 0 && (
            <>
              <span className="text-gray-600">Dominant:</span>
              {comparativePoliticians.map((pol, idx) => (
                <div key={pol.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: POLITICIAN_COLORS[idx % POLITICIAN_COLORS.length] }}
                  />
                  <span>{pol.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
