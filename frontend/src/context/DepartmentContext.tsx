import React, { createContext, useContext, useState } from 'react';
import { DEPARTMENTS } from '../mock/dashboardData';
import type { DepartmentInfo } from '../mock/dashboardData';

interface DepartmentContextType {
  selectedDepartmentId: string;
  setSelectedDepartmentId: (id: string) => void;
  activeDepartment: DepartmentInfo;
  allDepartments: DepartmentInfo[];
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const DepartmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('all');

  const activeDepartment =
    DEPARTMENTS.find((d) => d.id === selectedDepartmentId) || DEPARTMENTS[0];

  return (
    <DepartmentContext.Provider
      value={{
        selectedDepartmentId,
        setSelectedDepartmentId,
        activeDepartment,
        allDepartments: DEPARTMENTS,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
};

export const useDepartment = (): DepartmentContextType => {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
};
