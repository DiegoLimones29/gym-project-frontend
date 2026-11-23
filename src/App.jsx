import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { useAuth } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { OverviewPage } from './features/dashboard/pages/OverviewPage';
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
  const role = user?.roleId === 7 ? 'admin' : (user?.role ?? 'worker');
  return allowedRoles.includes(role) ? (
    <Outlet />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />

            <Route element={<RoleRoute allowedRoles={['admin', 'worker']} />}>
              <Route path="register" element={<RegisterPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="classes" element={<ClassesPage />} />
              <Route path="workouts" element={<WorkoutPlansPage />} />
              <Route path="assessments" element={<AssessmentsPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={['admin']} />}>
              <Route path="workers" element={<WorkersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;