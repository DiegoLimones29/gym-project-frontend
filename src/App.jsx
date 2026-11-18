import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { MembersPage } from './features/profiles/pages/MembersPage';
import { WorkersPage } from './features/profiles/pages/WorkersPage';
import { PlansPage } from './features/plans/pages/PlansPage';
import { ClassesPage } from './features/classes/pages/ClassesPage';
import { WorkoutPlansPage } from './features/workouts/pages/WorkoutPlansPage';
import { AssessmentsPage } from './features/assessments/pages/AssessmentsPage';
import { DashboardLayout } from './components/DashboardLayout';

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();
  const role = user?.role ?? 'member';
  return allowedRoles.includes(role) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

function DashboardOverview() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Bienvenido</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Sesión activa como <span className="text-yellow-400">{user?.email}</span>
      </p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />

            <Route element={<RoleRoute allowedRoles={['admin', 'worker']} />}>
              <Route path="register" element={<RegisterPage />} />
              <Route path="members" element={<MembersPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="workers" element={<WorkersPage />} />
            </Route>

            <Route path="plans" element={<PlansPage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="workouts" element={<WorkoutPlansPage />} />
            <Route path="assessments" element={<AssessmentsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;