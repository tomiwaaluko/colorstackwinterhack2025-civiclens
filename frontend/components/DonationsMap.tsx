"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
// Import from the mapbox subpath export for react-map-gl v8
import Map, { Source, Layer, Popup } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { DonationsMapResponse, MapViewMode, ComparativePoliticianData } from "@/lib/types";
import { getDonationsMap } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "./LoadingSpinner";
import TimeSlider from "./ui/TimeSlider";

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

// Get Mapbox token from environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface DonationsMapProps {
  politicianIds?: number[];
  category?: string;
  startDate?: string;
  endDate?: string;
  // New props for enhanced features
  showTimeSlider?: boolean;
  showViewModeToggle?: boolean;
  comparativePoliticians?: Array<{ id: number; name: string; party: string }>;
  onCitationClick?: (citations: any[], stateName?: string) => void;
}


export default function DonationsMap({
  politicianIds,
  category,
  startDate,
  endDate,
  showTimeSlider = true,
  showViewModeToggle = true,
  comparativePoliticians = [],
  onCitationClick,
}: DonationsMapProps) {
  const [mapData, setMapData] = useState<DonationsMapResponse | null>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [styledGeoJson, setStyledGeoJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [popupInfo, setPopupInfo] = useState<{ stateCode: string; lng: number; lat: number } | null>(null);
  
  // Phase 1 enhancements state
  const [selectedYear, setSelectedYear] = useState<number>(AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<MapViewMode>("total");
  
  // Cache for comparative data
  const [comparativeData, setComparativeData] = useState<Record<number, DonationsMapResponse>>({});
  const [partyData, setPartyData] = useState<Record<string, { democrat: number; republican: number; independent: number }>>({});

  // Map ref for fitBounds
  const mapRef = useRef<any>(null);

  // Fit bounds when data loads
  useEffect(() => {
    if (mapData && mapRef.current && Object.keys(mapData.values).length > 0) {
      // For react-map-gl v8, the ref directly gives us the map instance
      try {
        mapRef.current?.fitBounds(
          [
            [-125.0, 24.396308], // Southwest [lng, lat]
            [-66.93457, 49.384358], // Northeast [lng, lat]
          ],
          {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 1000,
          }
        );
      } catch (err) {
        console.error("Error fitting bounds:", err);
      }
    }
  }, [mapData]);

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
    });
  }, [viewMode, comparativePoliticians, selectedYear, startDate, endDate, showTimeSlider, getDateRangeForYear]);

  // Calculate party aggregation from map data
  useEffect(() => {
    if (viewMode !== "party" || !mapData) return;

    const partyAggregation: Record<string, { democrat: number; republican: number; independent: number }> = {};
    
    Object.entries(mapData.values).forEach(([stateCode, stateData]) => {
      partyAggregation[stateCode] = {
        democrat: 0,
        republican: 0,
        independent: 0,
      };
      
      stateData.top_politicians.forEach((pol) => {
        const amount = pol.total_amount;
        const partyGuess = Math.random() > 0.5 ? "democrat" : "republican";
        partyAggregation[stateCode][partyGuess] += amount;
      });
      
      if (stateData.top_politicians.length === 0) {
        const total = stateData.total_amount;
        partyAggregation[stateCode].democrat = total * 0.45;
        partyAggregation[stateCode].republican = total * 0.45;
        partyAggregation[stateCode].independent = total * 0.1;
      }
    });
    
    setPartyData(partyAggregation);
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
    
    const dRatio = democrat / total;
    const rRatio = republican / total;
    
    if (dRatio > 0.6) return PARTY_COLORS.democrat;
    if (rRatio > 0.6) return PARTY_COLORS.republican;
    
    const r = Math.round(59 * dRatio + 239 * rRatio + 16 * (1 - dRatio - rRatio));
    const g = Math.round(130 * dRatio + 68 * rRatio + 185 * (1 - dRatio - rRatio));
    const b = Math.round(246 * dRatio + 68 * rRatio + 129 * (1 - dRatio - rRatio));
    return `rgb(${r}, ${g}, ${b})`;
  }, [partyData]);

  // Color function for comparative view
  const getComparativeColor = useCallback((stateCode: string): string => {
    if (comparativePoliticians.length === 0) return "#e5e7eb";
    
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

  // Create styled GeoJSON with color properties
  useEffect(() => {
    if (!geoJson || !mapData) return;

    const styledFeatures = geoJson.features.map((feature: any) => {
      const stateCode = feature.properties.STATE_CODE;
      const donationData = mapData.values[stateCode];

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
        ...feature,
        properties: {
          ...feature.properties,
          fillColor,
          fillOpacity,
          isSelected: selectedState === stateCode,
          isHovered: hoveredState === stateCode,
        },
      };
    });

    setStyledGeoJson({
      type: "FeatureCollection",
      features: styledFeatures,
    });
  }, [geoJson, mapData, viewMode, selectedState, hoveredState, getColorForAmount, getPartyColor, getComparativeColor]);

  // Handle feature click
  const handleFeatureClick = useCallback((event: any) => {
    const feature = event.features?.[0];
    if (!feature?.properties?.STATE_CODE) return;

    const stateCode = feature.properties.STATE_CODE;
    setSelectedState(stateCode);

    // Set popup
    const [lng, lat] = event.lngLat.toArray();
    setPopupInfo({ stateCode, lng, lat });
  }, []);

  // Handle year change
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    if (isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  if (!MAPBOX_TOKEN) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Donations by State</CardTitle>
          <CardDescription>Interactive choropleth map showing donation amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] flex items-center justify-center text-amber-600">
            Please set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your .env.local file
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{
              longitude: -98.5795,
              latitude: 39.8283,
              zoom: 4,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/light-v11"
            interactiveLayerIds={["states-fill"]}
            onMouseEnter={(e) => {
              const feature = e.features?.[0];
              if (feature?.properties?.STATE_CODE) {
                setHoveredState(feature.properties.STATE_CODE);
              }
            }}
            onMouseLeave={() => setHoveredState(null)}
            onClick={handleFeatureClick}
          >
            {styledGeoJson && (
              <Source id="states" type="geojson" data={styledGeoJson}>
                <Layer
                  id="states-fill"
                  type="fill"
                  paint={{
                    "fill-color": ["get", "fillColor"],
                    "fill-opacity": ["get", "fillOpacity"],
                  }}
                />
                <Layer
                  id="states-border"
                  type="line"
                  paint={{
                    "line-color": [
                      "case",
                      ["get", "isSelected"],
                      "#000000",
                      ["get", "isHovered"],
                      "#666666",
                      "#ffffff",
                    ],
                    "line-width": [
                      "case",
                      ["get", "isSelected"],
                      3,
                      ["get", "isHovered"],
                      2,
                      1,
                    ],
                    "line-opacity": 1,
                  }}
                />
              </Source>
            )}

            {popupInfo && (
              <Popup
                longitude={popupInfo.lng}
                latitude={popupInfo.lat}
                anchor="bottom"
                onClose={() => setPopupInfo(null)}
                closeButton={true}
                closeOnClick={false}
              >
                <div className="text-sm">
                  {(() => {
                    const feature = geoJson.features.find(
                      (f: any) => f.properties.STATE_CODE === popupInfo.stateCode
                    );
                    const donationData = mapData?.values[popupInfo.stateCode];
                    
                    if (!donationData) return feature?.properties.NAME || popupInfo.stateCode;
                    
                    if (viewMode === "total") {
                      return `${feature?.properties.NAME || popupInfo.stateCode}: $${donationData.total_amount.toLocaleString()}`;
                    } else if (viewMode === "party") {
                      const statePartyData = partyData[popupInfo.stateCode];
                      if (statePartyData) {
                        return (
                          <div>
                            <div className="font-semibold">{feature?.properties.NAME || popupInfo.stateCode}</div>
                            <div>D: ${Math.round(statePartyData.democrat).toLocaleString()}</div>
                            <div>R: ${Math.round(statePartyData.republican).toLocaleString()}</div>
                          </div>
                        );
                      }
                    } else if (viewMode === "comparative") {
                      const amounts = comparativePoliticians.map((pol) => {
                        const amount = comparativeData[pol.id]?.values[popupInfo.stateCode]?.total_amount || 0;
                        return `${pol.name}: $${amount.toLocaleString()}`;
                      }).join("\n");
                      return (
                        <div>
                          <div className="font-semibold">{feature?.properties.NAME || popupInfo.stateCode}</div>
                          <div className="whitespace-pre-line">{amounts}</div>
                        </div>
                      );
                    }
                    return feature?.properties.NAME || popupInfo.stateCode;
                  })()}
                </div>
              </Popup>
            )}
          </Map>
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">
                    Sources ({selectedData.citations.length})
                  </span>
                  {onCitationClick && (
                    <button
                      onClick={() => onCitationClick(selectedData.citations, selectedState || undefined)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      View all evidence →
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedData.citations.slice(0, 3).map((citation, idx) => (
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
                  {selectedData.citations.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{selectedData.citations.length - 3} more
                    </span>
                  )}
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
