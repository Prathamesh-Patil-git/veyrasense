import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  timeframe?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  accent?: 'yellow' | 'mint' | 'blue' | 'slate';
  sparkline?: number[];
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  change,
  changeType = 'neutral',
  timeframe = 'vs last cycle',
  icon,
  badge,
  accent = 'mint',
  sparkline = [20, 25, 22, 35, 30, 42, 40, 55],
  className = '',
}) => {
  const accentPills = {
    yellow: 'bg-[#FFF9DE] text-[#875B00] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
    mint: 'bg-[#E8FAF1] text-[#0C5A37] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
    blue: 'bg-[#EBF4FE] text-[#134685] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
    slate: 'bg-[#EDEFEA] text-[#172238] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]',
  };

  const sparklineStroke = {
    yellow: '#FFD21C',
    mint: '#12824C',
    blue: '#5BA4F5',
    slate: '#172238',
  };

  const max = Math.max(...sparkline, 1);
  const min = Math.min(...sparkline, 0);
  const range = max - min || 1;
  const width = 110;
  const height = 30;
  const points = sparkline
    .map((val, idx) => {
      const x = (idx / (sparkline.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={`clay-surface-interactive p-5 sm:p-6 text-[#172238] flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className={`p-2.5 rounded-2xl flex items-center justify-center ${accentPills[accent]}`}>
                {icon}
              </div>
            )}
            <span className="text-xs font-semibold text-[#718096] uppercase tracking-wider">
              {label}
            </span>
          </div>
          {badge}
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl sm:text-4xl font-black text-[#172238] tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-bold text-[#718096]">{unit}</span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[#F2F3EE] flex items-center justify-between gap-2 mt-auto">
        {change && (
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {changeType === 'positive' && (
              <span className="inline-flex items-center gap-0.5 text-[#0C5A37] bg-[#E8FAF1] px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                {change}
              </span>
            )}
            {changeType === 'negative' && (
              <span className="inline-flex items-center gap-0.5 text-[#A82824] bg-[#FDF0F0] px-2 py-0.5 rounded-full">
                <TrendingDown className="w-3.5 h-3.5" />
                {change}
              </span>
            )}
            {changeType === 'neutral' && (
              <span className="inline-flex items-center gap-0.5 text-[#718096] bg-[#EDEFEA] px-2 py-0.5 rounded-full">
                <Minus className="w-3.5 h-3.5" />
                {change}
              </span>
            )}
            <span className="text-[11px] text-[#718096] hidden sm:inline">{timeframe}</span>
          </div>
        )}

        {/* Tactile Inset Sparkline Well */}
        <div className="p-1 px-1.5 rounded-xl bg-[#F7F7F0] shadow-[inset_0_1px_2px_rgba(23,34,56,0.05)]">
          <svg width={width} height={height} className="overflow-visible block">
            <polyline
              fill="none"
              stroke={sparklineStroke[accent]}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
