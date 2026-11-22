import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { EnvironmentProvider } from './context/EnvironmentContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EnvironmentProvider>
          <DepartmentProvider>
            <AppRoutes />
          </DepartmentProvider>
        </EnvironmentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
