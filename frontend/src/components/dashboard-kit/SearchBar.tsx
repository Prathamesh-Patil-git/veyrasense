import React from 'react';
import { Search } from 'lucide-react';

export interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  shortcut?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search telemetry feeds, sensor nodes, diagnostic alerts...',
  value,
  onChange,
  shortcut = '⌘K',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <div className="absolute left-3.5 text-[#718096] pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full clay-recessed text-[#172238] placeholder-[#718096]/70 text-xs sm:text-sm rounded-full pl-10 pr-14 py-2 sm:py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-[#FFD21C] focus:bg-white"
      />
      {shortcut && (
        <kbd className="absolute right-3.5 hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-[#718096] bg-white rounded-md shadow-2xs">
          {shortcut}
        </kbd>
      )}
    </div>
  );
};
