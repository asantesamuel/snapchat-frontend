import { NavLink, useNavigate } from 'react-router-dom';
import {
  MessageCircle, BookOpen, Camera,
  Users, User
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useFriends } from '@/hooks/useFriends';

// BottomNav renders on small screens (below md breakpoint)
// it sits fixed at the very bottom of the viewport
// the camera button is the centrepiece — elevated above the bar
// with a yellow circle, matching Snapchat's camera-first philosophy

const BottomNav = () => {
  const navigate          = useNavigate();
  const { pendingCount }  = useFriends();

  const links = [
    { to: '/chat',     icon: MessageCircle, label: 'Chat'    },
    { to: '/stories',  icon: BookOpen,      label: 'Stories' },
    { to: '/friends',  icon: Users,         label: 'Friends' },
    { to: '/profile',  icon: User,          label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* frosted glass bar */}
      <div className="bg-black/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pb-safe-area-inset-bottom">
        <div className="flex items-end justify-around">

          {/* left two links */}
          {links.slice(0, 2).map(link => (
            <NavLink
              key={link.to}
              title={link.label}
              to={link.to}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-1 px-4 py-3 transition-all',
                isActive ? 'text-[#FFFC00]' : 'text-white/30 hover:text-white/60'
              )}
            >
              {({ isActive }) => (
                <>
                  <link.icon className={cn(
                    'w-5 h-5 transition-transform',
                    isActive && 'scale-110'
                  )} />
                  <span className="text-[10px] font-bold">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* centre camera button — elevated above the bar */}
          <div className="flex flex-col items-center pb-1 -mt-4">
            <button
              onClick={() => navigate('/camera')}
              title="Camera"
              className="w-14 h-14 rounded-full bg-[#FFFC00] flex items-center justify-center shadow-[0_0_24px_rgba(255,252,0,0.4)] hover:bg-yellow-300 active:scale-90 transition-all"
            >
              <Camera className="w-7 h-7 text-black" />
            </button>
            <span className="text-[9px] text-white/25 mt-1 font-bold">Camera</span>
          </div>

          {/* right two links */}
          {links.slice(2).map(link => (
            <NavLink
              key={link.to}
              title={link.label}
              to={link.to}
              className={({ isActive }) => cn(
                'relative flex flex-col items-center gap-1 px-4 py-3 transition-all',
                isActive ? 'text-[#FFFC00]' : 'text-white/30 hover:text-white/60'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <link.icon className={cn(
                      'w-5 h-5 transition-transform',
                      isActive && 'scale-110'
                    )} />
                    {/* pending friend request badge on Friends tab */}
                    {link.to === '/friends' && pendingCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold">{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;