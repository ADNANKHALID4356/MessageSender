'use client';

import React, { useState } from 'react';
import { useGenerateReport } from '@/hooks/use-admin';
import type { ReportResult } from '@/services/admin.service';

// ===========================================
// Report Types
// ===========================================

const REPORT_TYPES = [
  { value: 'campaign_summary', label: 'Campaign Summary', description: 'Overview of campaign performance and delivery stats' },
  { value: 'contact_growth', label: 'Contact Growth', description: 'New contacts, growth rate, and source breakdown' },
  { value: 'engagement', label: 'Engagement', description: 'Message activity, response rates, and bypass usage' },
  { value: 'compliance', label: 'Compliance', description: 'Tag usage, failure rates, and bypass method distribution' },
] as const;

// ===========================================
// Report Generator Component
// ===========================================

export function ReportGenerator({ workspaceId }: { workspaceId: string }) {
  const [reportType, setReportType] = useState<string>('campaign_summary');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [report, setReport] = useState<ReportResult | null>(null);

  const generateMutation = useGenerateReport();

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({
        workspaceId,
        reportType: reportType as any,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        format,
      });
      setReport(result);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleDownloadCsv = () => {
    if (!report?.csvContent) return;
    const blob = new Blob([report.csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reportType}_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Generator</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Generate detailed reports for your workspace</p>
      </div>

      {/* Report Configuration */}
      <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-900 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              {REPORT_TYPES.map(rt => (
                <option key={rt.value} value={rt.value}>{rt.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {REPORT_TYPES.find(rt => rt.value === reportType)?.description}
            </p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format
            </label>
            <div className="flex gap-3 mt-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={() => setFormat('json')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">JSON</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">CSV</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate Report'}
          </button>

          {report?.csvContent && (
            <button
              onClick={handleDownloadCsv}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Download CSV
            </button>
          )}
        </div>

        {generateMutation.isError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Failed to generate report. Please try again.
          </p>
        )}
      </div>

      {/* Report Results */}
      {report && (
        <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700">
          <div className="border-b p-4 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {REPORT_TYPES.find(rt => rt.value === report.reportType)?.label || report.reportType}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Generated: {new Date(report.generatedAt).toLocaleString()} |
                  Period: {new Date(report.period.startDate).toLocaleDateString()} - {new Date(report.period.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <ReportDataView data={report.data} reportType={report.reportType} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Report Data Viewer
// ===========================================

function ReportDataView({ data, reportType }: { data: any; reportType: string }) {
  if (!data) return <p className="text-sm text-gray-500">No data</p>;

  // Extract summary metrics from the data
  const summaryEntries = Object.entries(data).filter(
    ([, v]) => typeof v === 'number' || typeof v === 'string',
  );

  const objectEntries = Object.entries(data).filter(
    ([, v]) => typeof v === 'object' && v !== null && !Array.isArray(v),
  );

  const arrayEntries = Object.entries(data).filter(
    ([, v]) => Array.isArray(v),
  );

  return (
    <div className="space-y-4">
      {/* Summary Metrics */}
      {summaryEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {summaryEntries.map(([key, value]) => (
            <div key={key} className="rounded-lg border p-3 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                {key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage') ? '%' : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Object breakdowns */}
      {objectEntries.map(([key, value]) => (
        <div key={key}>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {Object.entries(value as Record<string, any>).map(([k, v]) => (
              <div key={k} className="rounded border p-2 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">{k}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {typeof v === 'number' ? v.toLocaleString() : String(v)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Array tables */}
      {arrayEntries.map(([key, arr]) => {
        const items = arr as any[];
        if (items.length === 0) return null;
        const cols = Object.keys(items[0]);
        return (
          <div key={key}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              <span className="ml-2 text-xs text-gray-500">({items.length} items)</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    {cols.slice(0, 8).map(col => (
                      <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.slice(0, 20).map((item, i) => (
                    <tr key={i}>
                      {cols.slice(0, 8).map(col => (
                        <td key={col} className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {typeof item[col] === 'number' ? item[col].toLocaleString() : String(item[col] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {items.length > 20 && (
                <p className="text-xs text-gray-500 mt-2 dark:text-gray-400">
                  Showing 20 of {items.length} items
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
