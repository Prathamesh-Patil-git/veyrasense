import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardBannerProps {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  onActionClick?: () => void | Promise<void>;
  nodeCount?: number;
  healthPercent?: number;
  departmentName?: string;
}

export const DashboardBanner: React.FC<DashboardBannerProps> = ({
  title = 'VeyraSense Operations Console',
  subtitle = 'Monitor sensor reliability, investigate suspicious measurements and maintain trusted industrial data.',
  actionLabel = 'View Sensor Network',
  actionHref = '/app/monitoring',
  onActionClick,
  nodeCount = 16,
  healthPercent = 99.4,
  departmentName = 'All Departments',
}) => {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative overflow-hidden clay-yellow-banner p-6 sm:p-8">
      {/* Decorative ambient specular glow */}
      <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-[#FFEFA8]/60 blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-56 h-56 rounded-full bg-white/40 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          {/* Status pill & Date */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-[11px] font-bold text-[#172238] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#718096]" />
              <span>{formattedDate}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF9DE] text-[11px] font-bold text-[#875B00] shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#FFD21C]" />
              <span>Edge Gateway Hub • {departmentName}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5A687C] leading-relaxed max-w-xl">
            {subtitle}
          </p>
        </div>

        {/* Right side quick action and status indicator */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[#172238] bg-white/85 px-3.5 py-1.5 rounded-2xl shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#78E9AD] animate-pulse" />
            <span>{nodeCount} Nodes Deployed</span>
            <span className="text-[#718096]">•</span>
            <span className="text-[#0C5A37]">{healthPercent}% Fleet Health</span>
          </div>

          {actionLabel && (
            actionHref ? (
              <Link to={actionHref} className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="md"
                  rightIcon={<ArrowRight className="w-4 h-4 text-[#FFD21C]" />}
                  className="w-full sm:w-auto"
                >
                  {actionLabel}
                </Button>
              </Link>
            ) : onActionClick ? (
              <Button
                variant="secondary"
                size="md"
                onClick={onActionClick}
                rightIcon={<ArrowRight className="w-4 h-4 text-[#FFD21C]" />}
                className="w-full sm:w-auto"
              >
                {actionLabel}
              </Button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};
