import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Settings, Edit2, Users, ArrowLeft,
  Camera, UserCheck
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useProfile, PROFILE_KEY } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';

// ProfilePage is the authenticated user's own profile
// it shows their avatar, username, bio, and friend count
// it is read-only here — editing happens on EditProfilePage
// the two action buttons are "Edit Profile" and "Friends"

const ProfilePage = () => {
  const navigate       = useNavigate();
  const { user }       = useAuthStore();
  const { profile, isLoading } = useProfile();
  const { friendCount } = useFriends();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const displayProfile = profile || user;
  if (!displayProfile) return null;

  return (
    <div className="min-h-screen bg-black">

      {/* ── Top navigation ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          title="Go back"
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <button
          onClick={() => navigate('/settings')}
          title="Settings"
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Settings className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* ── Hero section ────────────────────────────────────────────── */}
      {/* large avatar dominating the upper portion of the screen */}
      <div className="flex flex-col items-center px-6 pt-4 pb-8">

        {/* avatar with yellow glow — the visual centrepiece */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-[#FFFC00]/20 blur-2xl scale-110" />
          <Avatar
            src={displayProfile.avatarUrl}
            username={displayProfile.username}
            size="xl"
            ring
            className="relative"
          />
          {/* small camera shortcut badge */}
          <button
            onClick={() => navigate('/profile/edit')}
            title="Change profile photo"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFFC00] flex items-center justify-center border-2 border-black hover:bg-yellow-300 transition-colors"
          >
            <Camera className="w-4 h-4 text-black" />
          </button>
        </div>

        {/* username */}
        <h1 className="text-white text-2xl font-black tracking-tight mb-1">
          {displayProfile.username}
        </h1>

        {/* bio — shows placeholder if empty */}
        <p className={`text-center text-sm leading-relaxed max-w-xs mb-6 ${
          displayProfile.bioText ? 'text-white/60' : 'text-white/20 italic'
        }`}>
          {displayProfile.bioText || 'No bio yet — add one!'}
        </p>

        {/* stats row */}
        <div className="flex items-center gap-8 mb-8">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-white font-black text-xl">{friendCount}</span>
            <span className="text-white/40 text-xs font-medium">Friends</span>
          </div>
          {/* divider */}
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-white font-black text-xl">0</span>
            <span className="text-white/40 text-xs font-medium">Stories</span>
          </div>
        </div>

        {/* action buttons */}
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/profile/edit')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FFFC00] text-black font-bold text-sm hover:bg-yellow-300 active:scale-95 transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            onClick={() => navigate('/friends')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white font-bold text-sm hover:bg-white/10 active:scale-95 transition-all"
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
        </div>
      </div>

      {/* ── Subtle dot grid decorative background ───────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,252,0,0.03) 1px, transparent 1px)',
          backgroundSize:  '32px 32px',
        }}
      />
    </div>
  );
};

export default ProfilePage;