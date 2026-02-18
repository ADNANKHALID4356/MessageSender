'use client';

import React from 'react';
import { useSystemHealth } from '@/hooks/use-admin';

// ===========================================
// Health Status Indicator
// ===========================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    unhealthy: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      <span className={`mr-1.5 h-2 w-2 rounded-full ${status === 'healthy' ? 'bg-green-400' : status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ===========================================
// Service Card
// ===========================================

function ServiceCard({ name, health }: { name: string; health: { status: string; latencyMs: number; details?: string } }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</h3>
        <StatusBadge status={health.status} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Latency: {health.latencyMs}ms
      </p>
      {health.details && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{health.details}</p>
      )}
    </div>
  );
}

// ===========================================
// System Health Dashboard
// ===========================================

export function SystemHealthDashboard() {
  const { data: health, isLoading, error, refetch } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !health) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:bg-red-900/20 dark:border-red-800">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load system health</h3>
        <p className="mt-1 text-sm text-red-600 dark:text-red-300">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-3 text-sm text-red-700 underline hover:text-red-800 dark:text-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  const memPercent = health.system.memoryUsage.usagePercent;
  const uptimeHours = Math.floor(health.system.uptime / 3600);
  const uptimeMinutes = Math.floor((health.system.uptime % 3600) / 60);

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Health</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last checked: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={health.status} />
          <button
            onClick={() => refetch()}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Service Status Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ServiceCard name="Database" health={health.services.database} />
          <ServiceCard name="Redis" health={health.services.redis} />
          <ServiceCard name="Facebook API" health={health.services.facebookApi} />
          <ServiceCard name="Job Queues" health={health.services.jobQueues} />
        </div>
      </div>

      {/* System Metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Memory Usage</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{memPercent}%</p>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${memPercent > 80 ? 'bg-red-500' : memPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(memPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              {Math.round(health.system.memoryUsage.heapUsed / 1024 / 1024)}MB / {Math.round(health.system.memoryUsage.heapTotal / 1024 / 1024)}MB
            </p>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU Usage</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {health.system.cpuUsage}%
            </p>
            <div className="mt-2 h-2 w-full bg-gray-200 rounded-full dark:bg-gray-700">
              <div
                className={`h-2 rounded-full ${health.system.cpuUsage > 80 ? 'bg-red-500' : health.system.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(health.system.cpuUsage, 100)}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uptime</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {uptimeHours}h {uptimeMinutes}m
            </p>
            <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
              Node {health.system.nodeVersion}
            </p>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">RSS Memory</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(health.system.memoryUsage.rss / 1024 / 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Workspace Stats */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Workspace Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(health.workspaceStats).map(([key, value]) => (
            <div key={key} className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
