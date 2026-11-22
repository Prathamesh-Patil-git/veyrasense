import React, { createContext, useContext, useMemo, useState } from 'react';

export type Environment = 'real' | 'demo';
interface EnvironmentContextValue { environment: Environment; setEnvironment: (environment: Environment) => void; }
const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export const EnvironmentProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [environment, setEnvironmentState] = useState<Environment>(() =>
    localStorage.getItem('veyrasense_environment') === 'demo' ? 'demo' : 'real'
  );
  const setEnvironment = (value: Environment) => {
    localStorage.setItem('veyrasense_environment', value);
    setEnvironmentState(value);
  };
  const value = useMemo(() => ({ environment, setEnvironment }), [environment]);
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
};

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) throw new Error('useEnvironment must be used inside EnvironmentProvider');
  return context;
}
