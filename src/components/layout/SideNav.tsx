import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageCircle, BookOpen, Camera,
  Users, User, Settings, LogOut
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import Avatar from '@/components/ui/Avatar';

// SideNav renders on md+ screens as a fixed-width vertical sidebar
// it uses the "icon + label" pattern with the active item highlighted
// in yellow. The camera button is the visual hero — full yellow pill
// The user's avatar at the bottom gives quick access to profile/settings

const SideNav = () => {
  const navigate         = useNavigate();
  const { user }         = useAuthStore();
  const { logout }       = useAuth();
  const { pendingCount } = useFriends();

  const navItems = [
    { to: '/chat',    icon: MessageCircle, label: 'Chats'   },
    { to: '/stories', icon: BookOpen,      label: 'Stories' },
    { to: '/friends', icon: Users,         label: 'Friends' },
    { to: '/profile', icon: User,          label: 'Profile' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen bg-black border-r border-white/[0.06] shrink-0 fixed left-0 top-0 z-40">

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6 pt-8 pb-6">
        {/* compact: just the ghost icon. expanded: icon + wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFFC00] rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(255,252,0,0.25)]">
            <svg viewBox="0 0 100 100" className="w-6 h-6" fill="black">
              <path d="M50 10C33 10 22 22 22 38c0 5 1 9 3 13l-4 2c-1 0.5-1.5 2-0.5 3l1 2c0.5 1 2 1.5 3 1l2-1c2 3 5 5 8 6-1 2-4 3-8 4-1 0.3-2 1.5-1.5 2.5 0.5 2 4 3 9 4 0.5 1 1 3 2 4 0.5 1 1.5 1 2.5 0.8 1-0.2 3-0.8 6-0.8s5 0.6 6 0.8c1 0.2 2-0.2 2.5-0.8 1-1 1.5-3 2-4 5-1 8.5-2 9-4 0.5-1-0.5-2.2-1.5-2.5-4-1-7-2-8-4 3-1 6-3 8-6l2 1c1 0.5 2.5 0 3-1l1-2c1-1 0.5-2.5-0.5-3l-4-2c2-4 3-8 3-13C78 22 67 10 50 10z"/>
            </svg>
          </div>
          {/* wordmark only on lg screens */}
          <span className="hidden lg:block text-white font-black text-lg tracking-tight">
            Snapchat
          </span>
        </div>
      </div>

      {/* ── Camera CTA ──────────────────────────────────────────────── */}
      {/* primary action — the most prominent element in the nav */}
      <div className="px-3 lg:px-4 mb-6">
        <button
          onClick={() => navigate('/camera')}
          className="w-full flex items-center justify-center lg:justify-start gap-3 py-3 px-3 rounded-2xl bg-[#FFFC00] text-black font-bold hover:bg-yellow-300 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,252,0,0.2)]"
        >
          <Camera className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm">Open Camera</span>
        </button>
      </div>

      {/* ── Nav links ───────────────────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-1 px-2 lg:px-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'relative flex items-center justify-center lg:justify-start gap-3',
              'px-3 py-3 rounded-2xl transition-all duration-150 group',
              isActive
                ? 'bg-[#FFFC00]/10 text-[#FFFC00]'
                : 'text-white/40 hover:bg-white/[0.04] hover:text-white/80'
            )}
          >
            {({ isActive }) => (
              <>
                {/* active indicator pill on the left edge */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FFFC00] rounded-r-full" />
                )}

                <div className="relative shrink-0">
                  <item.icon className={cn(
                    'w-5 h-5 transition-all',
                    isActive && 'scale-110'
                  )} />
                  {/* badge for friends requests */}
                  {item.to === '/friends' && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>

                <span className={cn(
                  'hidden lg:block text-sm font-semibold transition-all',
                  isActive && 'font-bold'
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Settings ────────────────────────────────────────────────── */}
      <div className="px-2 lg:px-3 mb-2">
        <NavLink
          to="/settings"
          className={({ isActive }) => cn(
            'flex items-center justify-center lg:justify-start gap-3',
            'px-3 py-3 rounded-2xl transition-all',
            isActive
              ? 'bg-[#FFFC00]/10 text-[#FFFC00]'
              : 'text-white/30 hover:bg-white/[0.04] hover:text-white/60'
          )}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden lg:block text-sm font-semibold">Settings</span>
        </NavLink>
      </div>

      {/* ── User profile strip ───────────────────────────────────────── */}
      {/* clicking opens profile page */}
      <div className="px-2 lg:px-3 pb-6 border-t border-white/[0.06] pt-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Avatar
              src={user?.avatarUrl}
              username={user?.username || '?'}
              size="sm"
              className="shrink-0"
            />
            <div className="hidden lg:block min-w-0 text-left">
              <p className="text-white text-sm font-bold truncate">{user?.username}</p>
              <p className="text-white/30 text-xs truncate">{user?.email}</p>
            </div>
          </button>

          {/* logout button */}
          <button
            onClick={logout}
            title="Log out"
            className="hidden lg:flex w-8 h-8 rounded-full items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SideNav;