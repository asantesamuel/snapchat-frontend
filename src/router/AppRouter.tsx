import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// pages — all lazy loaded so the initial bundle stays small
import { lazy, Suspense } from 'react';

const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const ChatPage           = lazy(() => import('@/pages/chat/ChatPage'));
const StoriesPage        = lazy(() => import('@/pages/stories/StoriesPage'));
const CameraPage         = lazy(() => import('@/pages/camera/CameraPage'));
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'));
const EditProfilePage    = lazy(() => import('@/pages/profile/EditProfilePage'));
const FriendsPage        = lazy(() => import('@/pages/friends/FriendsPage'));
const SettingsPage       = lazy(() => import('@/pages/settings/SettingsPage'));

const AppRouter = () => (
  <BrowserRouter>
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    }>
      <Routes>
        {/* Public routes */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password"  element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route path="/chat" element={
          <ProtectedRoute><ChatPage /></ProtectedRoute>
        } />
        <Route path="/stories" element={
          <ProtectedRoute><StoriesPage /></ProtectedRoute>
        } />
        <Route path="/camera" element={
          <ProtectedRoute><CameraPage /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute><EditProfilePage /></ProtectedRoute>
        } />
        <Route path="/friends" element={
          <ProtectedRoute><FriendsPage /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><SettingsPage /></ProtectedRoute>
        } />

        {/* Default redirects */}
        <Route path="/"  element={<Navigate to="/chat"  replace />} />
        <Route path="*"  element={<Navigate to="/chat"  replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default AppRouter;