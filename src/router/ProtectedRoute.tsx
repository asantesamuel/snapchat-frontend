import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  children?: React.ReactNode;
}

// ProtectedRoute handles two usage patterns:
//
// Pattern 1 — wrapping a specific page (children prop):
//   <ProtectedRoute><CameraPage /></ProtectedRoute>
//   renders CameraPage if authenticated, redirects to /login if not
//
// Pattern 2 — wrapping a layout route (no children):
//   <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
//   AppLayout renders <Outlet /> which React Router fills with the
//   active child route. ProtectedRoute guards the entire group.
//
// The location state trick preserves where the user was trying to go:
//   navigate('/login', { state: { from: location } })
// After login, useAuth reads location.state.from and redirects back.

const ProtectedRoute = ({ children }: Props) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location        = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // if children provided, render them (single page protection)
  // if no children, render Outlet (layout route group protection)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;