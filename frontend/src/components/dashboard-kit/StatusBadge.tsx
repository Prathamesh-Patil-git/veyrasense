import React from 'react';

export interface StatusBadgeProps {
  status: 'online' | 'healthy' | 'communicating' | 'syncing' | 'warning' | 'alert' | 'offline' | 'calibrating';
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  pulse = true,
}) => {
  const statusConfig = {
    // Mint-green indicators for healthy/online states (tactile pill with depth)
    online: {
      clayClass: 'clay-pill-mint',
      dot: 'bg-[#78E9AD]',
      defaultLabel: 'Healthy / Online',
    },
    healthy: {
      clayClass: 'clay-pill-mint',
      dot: 'bg-[#78E9AD]',
      defaultLabel: 'Verified',
    },
    // Soft blue accents for communication and network status
    communicating: {
      clayClass: 'clay-pill-blue',
      dot: 'bg-[#5BA4F5]',
      defaultLabel: 'MQTT Active',
    },
    syncing: {
      clayClass: 'clay-pill-blue',
      dot: 'bg-[#5BA4F5]',
      defaultLabel: 'Syncing Mesh',
    },
    // Golden-yellow for attention / challenge response
    warning: {
      clayClass: 'clay-pill-yellow',
      dot: 'bg-[#FFD21C]',
      defaultLabel: 'Attention / Suspect',
    },
    calibrating: {
      clayClass: 'clay-pill-yellow',
      dot: 'bg-[#FFD21C]',
      defaultLabel: 'Calibrating Drift',
    },
    // Red for alerts and faults
    alert: {
      clayClass: 'bg-[#FDF0F0] text-[#A82824] shadow-[0_4px_10px_rgba(239,100,97,0.25),inset_0_1px_1px_rgba(255,255,255,0.9)]',
      dot: 'bg-[#EF6461]',
      defaultLabel: 'Fault Detected',
    },
    offline: {
      clayClass: 'bg-[#EDEFEA] text-[#718096] shadow-[0_3px_8px_rgba(23,34,56,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)]',
      dot: 'bg-[#A0AEC0]',
      defaultLabel: 'Offline',
    },
  };

  const current = statusConfig[status] || statusConfig.online;
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full select-none ${current.clayClass} ${sizeStyles}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse && (status === 'online' || status === 'communicating' || status === 'alert') && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${current.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`} />
      </span>
      <span>{label || current.defaultLabel}</span>
    </span>
  );
};
