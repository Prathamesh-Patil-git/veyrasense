import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';

export const DepartmentSelector: React.FC = () => {
  const { selectedDepartmentId, setSelectedDepartmentId, activeDepartment, allDepartments } =
    useDepartment();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-surface-interactive text-xs font-semibold text-[#172238] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C] transition-all"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Switch Department Context"
      >
        <div className="w-5 h-5 rounded-md bg-[#FFF6C9] flex items-center justify-center text-[#172238] shrink-0 shadow-2xs">
          <Building2 className="w-3 h-3 text-[#172238]" />
        </div>
        <div className="flex items-baseline gap-1 text-left">
          <span className="text-[10px] uppercase font-bold text-[#718096]">Dept:</span>
          <span className="font-bold text-[#172238] max-w-[120px] truncate">
            {activeDepartment.name}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#718096] shrink-0" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-64 clay-surface shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#718096] border-b border-[#F2F3EE]">
            Filter Monitoring Context
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {allDepartments.map((dept) => {
              const isSelected = String(dept.id) === String(selectedDepartmentId);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    setSelectedDepartmentId(dept.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-[#FFF6C9] text-[#172238] font-bold'
                      : 'text-[#172238] hover:bg-[#F7F7F0]'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{dept.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#172238] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
