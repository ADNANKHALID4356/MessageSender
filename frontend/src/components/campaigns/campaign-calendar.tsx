'use client';

import React, { useState, useMemo } from 'react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useWorkspaceStore } from '@/stores/workspace-store';

// ===========================================
// Campaign Calendar View Component (FR-8.4.4)
// ===========================================

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    campaignType: string;
    scheduledAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  SCHEDULED: 'bg-blue-200 text-blue-800',
  RUNNING: 'bg-green-200 text-green-800',
  PAUSED: 'bg-yellow-200 text-yellow-800',
  COMPLETED: 'bg-purple-200 text-purple-800',
  CANCELLED: 'bg-red-200 text-red-800',
};

const TYPE_ICONS: Record<string, string> = {
  ONE_TIME: '📤',
  SCHEDULED: '📅',
  RECURRING: '🔄',
  DRIP: '💧',
  TRIGGER: '⚡',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CampaignCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id) ?? '';

  const { data: campaignsData } = useCampaigns(workspaceId, { limit: 100 });

  const campaigns = campaignsData?.data || [];

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      // Find campaigns scheduled for this day
      const dayCampaigns = campaigns.filter(c => {
        const dateStr = c.scheduledAt || c.startedAt;
        if (!dateStr) return false;
        const campaignDate = new Date(dateStr);
        return (
          campaignDate.getDate() === date.getDate() &&
          campaignDate.getMonth() === date.getMonth() &&
          campaignDate.getFullYear() === date.getFullYear()
        );
      });

      days.push({
        date,
        isCurrentMonth,
        isToday,
        campaigns: dayCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          campaignType: c.type,
          scheduledAt: c.scheduledAt || c.startedAt || c.createdAt,
        })),
      });

      if (i >= 34 && date > lastDay) break;
    }

    return days;
  }, [currentDate, campaigns]);

  const navigateMonth = (delta: number) => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ◀
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`
              min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors
              ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
              ${day.isToday ? 'bg-blue-50' : ''}
              ${selectedDay?.date.getTime() === day.date.getTime() ? 'ring-2 ring-blue-500 ring-inset' : ''}
              hover:bg-gray-50
            `}
            onClick={() => setSelectedDay(day)}
          >
            <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-blue-600' : ''}`}>
              {day.date.getDate()}
            </div>
            <div className="space-y-1">
              {day.campaigns.slice(0, 3).map(campaign => (
                <div
                  key={campaign.id}
                  className={`px-1 py-0.5 text-xs rounded truncate ${STATUS_COLORS[campaign.status] || 'bg-gray-100'}`}
                  title={`${campaign.name} (${campaign.status})`}
                >
                  {TYPE_ICONS[campaign.campaignType] || '📤'} {campaign.name}
                </div>
              ))}
              {day.campaigns.length > 3 && (
                <div className="text-xs text-gray-500 px-1">
                  +{day.campaigns.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedDay.campaigns.length > 0 && (
        <div className="border-t p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            {selectedDay.date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </h3>
          <div className="space-y-2">
            {selectedDay.campaigns.map(campaign => (
              <div
                key={campaign.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{TYPE_ICONS[campaign.campaignType] || '📤'}</span>
                  <div>
                    <div className="font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(campaign.scheduledAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' · '}
                      {campaign.campaignType.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[campaign.status] || 'bg-gray-100'}`}
                >
                  {campaign.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t p-3 flex flex-wrap gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-sm ${color.split(' ')[0]}`} />
            <span className="text-xs text-gray-600">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
