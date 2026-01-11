"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Table as TableIcon, X } from "lucide-react";

export interface TableColumn {
  key: string;
  header: string;
  type?: "string" | "number" | "currency" | "date" | "percent";
  format?: (value: any) => string;
}

export interface TableRow {
  [key: string]: any;
}

interface DataTableExportProps {
  title: string;
  description?: string;
  columns: TableColumn[];
  data: TableRow[];
  filename?: string;
}

export default function DataTableExport({
  title,
  description,
  columns,
  data,
  filename = "export",
}: DataTableExportProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Format cell value based on column type
  const formatValue = (value: any, column: TableColumn): string => {
    if (value === null || value === undefined) return "—";
    
    if (column.format) {
      return column.format(value);
    }
    
    switch (column.type) {
      case "currency":
        return `$${Number(value).toLocaleString()}`;
      case "number":
        return Number(value).toLocaleString();
      case "percent":
        return `${Number(value).toFixed(1)}%`;
      case "date":
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  // Generate CSV content
  const csvContent = useMemo(() => {
    const headers = columns.map((col) => `"${col.header}"`).join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          const formatted = formatValue(value, col);
          // Escape quotes and wrap in quotes
          return `"${formatted.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    return [headers, ...rows].join("\n");
  }, [columns, data]);

  // Download CSV
  const downloadCSV = () => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TableIcon className="h-4 w-4" />
          View as Table
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{data.length} rows</Badge>
              <Button variant="default" size="sm" onClick={downloadCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg" role="region" aria-label={`Data table: ${title}`}>
          <Table>
            <TableHeader className="sticky top-0 bg-gray-50">
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className="font-semibold"
                    scope="col"
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length} 
                    className="text-center py-8 text-gray-500"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {formatValue(row[column.key], column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Screen reader summary */}
        <div className="sr-only" aria-live="polite">
          Table with {data.length} rows and {columns.length} columns. 
          Use arrow keys to navigate cells.
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to generate table data from donations map
export function generateMapTableData(
  values: Record<string, any>
): { columns: TableColumn[]; data: TableRow[] } {
  const columns: TableColumn[] = [
    { key: "state", header: "State", type: "string" },
    { key: "total_amount", header: "Total Amount", type: "currency" },
    { key: "donation_count", header: "Donations", type: "number" },
    { key: "avg_amount", header: "Average", type: "currency" },
    { key: "top_category", header: "Top Category", type: "string" },
  ];

  const data: TableRow[] = Object.entries(values).map(([state, value]: [string, any]) => ({
    state,
    total_amount: value.total_amount,
    donation_count: value.donation_count,
    avg_amount: value.avg_amount,
    top_category: value.top_donor_category || "—",
  }));

  return { columns, data: data.sort((a, b) => b.total_amount - a.total_amount) };
}

// Helper to generate table data from timeline
export function generateTimelineTableData(
  events: any[]
): { columns: TableColumn[]; data: TableRow[] } {
  const columns: TableColumn[] = [
    { key: "date", header: "Date", type: "date" },
    { key: "type", header: "Type", type: "string" },
    { key: "title", header: "Title", type: "string" },
    { key: "outcome", header: "Outcome", type: "string" },
    { key: "citations", header: "Sources", type: "number" },
  ];

  const data: TableRow[] = events.map((event) => ({
    date: event.date,
    type: event.type,
    title: event.title,
    outcome: event.outcome || "—",
    citations: event.citation_count || 0,
  }));

  return { columns, data };
}

// Helper to generate table data from network graph
export function generateNetworkTableData(
  nodes: any[],
  edges: any[]
): { columns: TableColumn[]; data: TableRow[] } {
  const columns: TableColumn[] = [
    { key: "label", header: "Name", type: "string" },
    { key: "type", header: "Type", type: "string" },
    { key: "category", header: "Category", type: "string" },
    { key: "connections", header: "Connections", type: "number" },
    { key: "amount", header: "Amount", type: "currency" },
  ];

  const data: TableRow[] = nodes.map((node) => {
    const connections = edges.filter(
      (e) => e.source === node.id || e.target === node.id
    ).length;
    return {
      label: node.label,
      type: node.type,
      category: node.category || "—",
      connections,
      amount: node.amount || 0,
    };
  });

  return { columns, data: data.sort((a, b) => b.connections - a.connections) };
}

// Helper to generate table data from radial chart
export function generateRadialTableData(
  categories: any[]
): { columns: TableColumn[]; data: TableRow[] } {
  const columns: TableColumn[] = [
    { key: "category", header: "Category", type: "string" },
    { key: "total_amount", header: "Total Amount", type: "currency" },
    { key: "donation_count", header: "Donations", type: "number" },
    { key: "avg_amount", header: "Average", type: "currency" },
    { key: "bills_count", header: "Related Bills", type: "number" },
  ];

  const data: TableRow[] = categories.map((cat) => ({
    category: cat.category,
    total_amount: cat.total_amount,
    donation_count: cat.donation_count,
    avg_amount: cat.avg_amount,
    bills_count: cat.related_bills?.length || 0,
  }));

  return { columns, data: data.sort((a, b) => b.total_amount - a.total_amount) };
}
