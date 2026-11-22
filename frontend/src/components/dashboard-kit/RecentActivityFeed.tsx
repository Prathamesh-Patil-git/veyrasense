import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Radio,
  Cpu,
  Clock,
} from 'lucide-react';
import type { ActivityEvent } from '../../mock/dashboardData';

interface RecentActivityFeedProps {
  events: ActivityEvent[];
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ events }) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'recovery':
        return (
          <div className="p-2.5 rounded-2xl bg-[#E8FAF1] text-[#0C5A37] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'investigation':
        return (
          <div className="p-2.5 rounded-2xl bg-[#FDF0F0] text-[#B42318] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'registration':
        return (
          <div className="p-2.5 rounded-2xl bg-[#FFF6C9] text-[#172238] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            <Cpu className="w-4 h-4" />
          </div>
        );
      case 'telemetry':
      default:
        return (
          <div className="p-2.5 rounded-2xl bg-[#EBF4FE] text-[#134685] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
            <Radio className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="clay-surface p-6 sm:p-8 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2F3EE]">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#718096]" />
            <h3 className="text-lg font-black text-[#172238] tracking-tight">
              Operational Activity Feed
            </h3>
          </div>
          <p className="text-xs text-[#718096] mt-0.5">
            Audit trail of transducer faults, automated physical challenges and spatial recoveries.
          </p>
        </div>

        <span className="text-[10px] font-bold text-[#875B00] bg-[#FFF9DE] px-2.5 py-1 rounded-full shadow-2xs">
          Simulated Feed
        </span>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-[#F7F7F0] transition-colors"
          >
            {getEventIcon(event.type)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#172238] truncate">
                  {event.title}
                </span>
                <span className="text-[11px] font-medium text-[#718096] shrink-0">
                  {event.timestamp}
                </span>
              </div>
              <p className="text-xs text-[#5A687C] mt-0.5 leading-relaxed">
                {event.description}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-[#718096]">
                <span className="px-2 py-0.5 rounded-md bg-[#EEEFEA] font-semibold text-[#172238]">
                  {event.nodeId}
                </span>
                <span>•</span>
                <span>{event.departmentName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
