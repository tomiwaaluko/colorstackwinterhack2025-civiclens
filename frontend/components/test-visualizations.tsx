/**
 * Test component to verify visualization library imports
 * This file tests that all required libraries can be imported successfully
 */

'use client';

import dynamic from 'next/dynamic';

// Test ECharts import
export function TestECharts() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactECharts = require('echarts-for-react');
    return <div>✅ ECharts imported successfully</div>;
  } catch (error) {
    return <div>❌ ECharts import failed: {String(error)}</div>;
  }
}

// Test Leaflet import (dynamic to avoid SSR issues)
export const TestLeaflet = dynamic(
  () =>
    Promise.resolve(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { MapContainer, TileLayer } = require('react-leaflet');
        return <div>✅ React-Leaflet imported successfully</div>;
      } catch (error) {
        return <div>❌ React-Leaflet import failed: {String(error)}</div>;
      }
    }),
  { ssr: false }
);

// Test react-force-graph import
export function TestForceGraph() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ForceGraph2D = require('react-force-graph').default;
    return <div>✅ React-Force-Graph imported successfully</div>;
  } catch (error) {
    return <div>❌ React-Force-Graph import failed: {String(error)}</div>;
  }
}

// Combined test component
export default function TestVisualizations() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Visualization Library Tests</h2>
      <TestECharts />
      <TestForceGraph />
      <TestLeaflet />
    </div>
  );
}

