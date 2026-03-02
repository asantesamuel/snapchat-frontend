import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import Spinner from '@/components/ui/Spinner';

// ── Page imports ────────────────────────────────────────────────────
// all lazy-loaded so the initial JS bundle stays small
// each page is only downloaded when the user first navigates to it

// auth pages — public, no layout wrapper
const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));

// app pages — all wrapped in AppLayout via the layout route
const ChatPage           = lazy(() => import('@/pages/chat/ChatPage'));
const StoriesPage        = lazy(() => import('@/pages/stories/StoriesPage'));
const CameraPage         = lazy(() => import('@/pages/camera/CameraPage'));
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'));
const EditProfilePage    = lazy(() => import('@/pages/profile/EditProfilePage'));
const PublicProfilePage  = lazy(() => import('@/pages/profile/PublicProfilePage'));
const FriendsPage        = lazy(() => import('@/pages/friends/FriendsPage'));
const SettingsPage       = lazy(() => import('@/pages/settings/SettingsPage'));

// full-screen spinner shown during lazy-load chunks
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center bg-black">
    <Spinner size="lg" />
  </div>
);

const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={<PageLoader />}>
      <Routes>

        {/* ── Public routes — no nav, no layout ─────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* ── Camera — full-screen, no nav ──────────────────────── */}
        {/* camera is intentionally outside the layout route because */}
        {/* it renders full-screen and the sidebar would obscure it  */}
        <Route path="/camera" element={
          <ProtectedRoute><CameraPage /></ProtectedRoute>
        } />

        {/* ── Protected layout route ────────────────────────────── */}
        {/* every route nested inside this one automatically gets    */}
        {/* AppLayout (SideNav + BottomNav) rendered around it       */}
        {/* ProtectedRoute redirects to /login if not authenticated  */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="/chat"              element={<ChatPage />} />
          <Route path="/stories"           element={<StoriesPage />} />
          <Route path="/friends"           element={<FriendsPage />} />
          <Route path="/profile"           element={<ProfilePage />} />
          <Route path="/profile/edit"      element={<EditProfilePage />} />
          <Route path="/profile/:username" element={<PublicProfilePage />} />
          <Route path="/settings"          element={<SettingsPage />} />
        </Route>

        {/* ── Fallback redirects ─────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/chat"  replace />} />
        <Route path="*"  element={<Navigate to="/chat"  replace />} />

      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;