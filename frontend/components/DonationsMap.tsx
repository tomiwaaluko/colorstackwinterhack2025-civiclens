"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DonationsMapResponse } from "@/lib/types";
import { getDonationsMap } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "./LoadingSpinner";

// Fix Leaflet default marker icon issue
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface DonationsMapProps {
  politicianIds?: number[];
  category?: string;
  startDate?: string;
  endDate?: string;
}

// Component to update map bounds
function MapBounds({ data }: { data: DonationsMapResponse | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (data && Object.keys(data.values).length > 0) {
      // Fit bounds to US (simple approximation)
      map.fitBounds([
        [24.396308, -125.0], // Southwest
        [49.384358, -66.93457], // Northeast
      ]);
    }
  }, [map, data]);

  return null;
}

export default function DonationsMap({
  politicianIds,
  category,
  startDate,
  endDate,
}: DonationsMapProps) {
  const [mapData, setMapData] = useState<DonationsMapResponse | null>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

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

  // Load donation data
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getDonationsMap({
      politician_ids: politicianIds,
      category,
      start_date: startDate,
      end_date: endDate,
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
  }, [politicianIds, category, startDate, endDate]);

  // Calculate color scale
  const { minAmount, maxAmount } = useMemo(() => {
    if (!mapData) return { minAmount: 0, maxAmount: 1 };
    const amounts = Object.values(mapData.values).map((v) => v.total_amount);
    return {
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
    };
  }, [mapData]);

  // Color interpolation function
  const getColorForAmount = (amount: number): string => {
    if (maxAmount === minAmount) return "#3b82f6";
    const ratio = (amount - minAmount) / (maxAmount - minAmount);
    // Blue to red color scale
    const r = Math.round(59 + ratio * 196); // 59 -> 255
    const g = Math.round(130 - ratio * 130); // 130 -> 0
    const b = Math.round(246 - ratio * 246); // 246 -> 0
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Style function for GeoJSON
  const styleFeature = (feature: any) => {
    const stateCode = feature.properties.STATE_CODE;
    const donationData = mapData?.values[stateCode];
    const isSelected = selectedState === stateCode;

    return {
      fillColor: donationData
        ? getColorForAmount(donationData.total_amount)
        : "#e5e7eb",
      fillOpacity: donationData ? 0.7 : 0.3,
      weight: isSelected ? 3 : 1,
      color: isSelected ? "#000" : "#fff",
      opacity: 1,
    };
  };

  // Handle feature click
  const onEachFeature = (feature: any, layer: any) => {
    const stateCode = feature.properties.STATE_CODE;
    const donationData = mapData?.values[stateCode];

    if (donationData) {
      layer.bindTooltip(
        `${feature.properties.NAME || stateCode}: $${donationData.total_amount.toLocaleString()}`
      );
      layer.on({
        click: () => setSelectedState(stateCode),
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: "#000",
          });
        },
        mouseout: (e: any) => {
          if (selectedState !== stateCode) {
            const layer = e.target;
            layer.setStyle({
              weight: selectedState === stateCode ? 3 : 1,
              color: selectedState === stateCode ? "#000" : "#fff",
            });
          }
        },
      });
    }
  };

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
        <CardTitle>Donations by State</CardTitle>
        <CardDescription>Interactive choropleth map showing donation amounts by state</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <GeoJSON
              data={geoJson}
              style={styleFeature}
              onEachFeature={onEachFeature}
            />
          </MapContainer>
        </div>

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
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Amount:</span>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getColorForAmount(minAmount) }}
            />
            <span>${minAmount.toLocaleString()}</span>
          </div>
          <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded" />
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: getColorForAmount(maxAmount) }}
            />
            <span>${maxAmount.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

