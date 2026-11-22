import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { DepartmentProvider } from './context/DepartmentContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DepartmentProvider>
          <AppRoutes />
        </DepartmentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
