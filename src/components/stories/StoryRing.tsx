import { cn } from '@/utils/cn';
import { formatStoryCountdown } from '@/utils/time';
import type { StoryGroup } from '@/types/story.types';

// StoryRing is the circular avatar thumbnail in the stories feed row
// It shows a yellow ring if there are unviewed stories
// A dim grey ring if all stories in this group have been viewed
// The earliest-expiring story's countdown is shown beneath the username
// Tapping calls onClick to open the full-screen viewer

interface StoryRingProps {
  group:       StoryGroup;
  onClick:     () => void;
  size?:       'sm' | 'md' | 'lg';
  showExpiry?: boolean;
}

const sizes = {
  sm: { outer: 'w-14 h-14', inner: 'w-12 h-12', text: 'text-[10px]' },
  md: { outer: 'w-18 h-18', inner: 'w-16 h-16', text: 'text-xs'     },
  lg: { outer: 'w-20 h-20', inner: 'w-[72px] h-[72px]', text: 'text-xs' },
};

const StoryRing = ({
  group,
  onClick,
  size = 'md',
  showExpiry = true,
}: StoryRingProps) => {
  const { author, stories, allViewed } = group;
  const { outer, inner, text }         = sizes[size];

  // find the story with the least time remaining to show the expiry
  const soonestExpiry = stories.reduce((min, s) =>
    s.secondsRemaining < min ? s.secondsRemaining : min,
    Infinity
  );

  const isUrgent = soonestExpiry < 3600; // less than 1 hour

  // gradient colours for the ring
  // unviewed: bright yellow Snapchat gradient
  // viewed: muted grey
  const ringStyle = allViewed
    ? { background: 'rgba(255,255,255,0.15)' }
    : {
        background: 'linear-gradient(135deg, #FFFC00 0%, #FF6B35 50%, #FFFC00 100%)',
      };

  const initials = author.username.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 group"
    >
      {/* ring + avatar container */}
      <div className="relative">
        {/* the gradient ring is a slightly larger div behind the avatar */}
        <div
          className={cn('rounded-full flex items-center justify-center p-[2.5px] transition-transform group-active:scale-95', outer)}
          style={ringStyle}
        >
          {/* white gap between ring and avatar */}
          <div className="w-full h-full rounded-full bg-black p-[2px] flex items-center justify-center">
            {/* avatar */}
            <div className={cn('rounded-full overflow-hidden bg-[#FFFC00] flex items-center justify-center shrink-0', inner)}>
              {author.avatarUrl ? (
                <img
                  src={author.avatarUrl}
                  alt={author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-black text-black text-lg">{initials}</span>
              )}
            </div>
          </div>
        </div>

        {/* unviewed count badge */}
        {!allViewed && (
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FFFC00] border-2 border-black flex items-center justify-center">
            <span className="text-black text-[9px] font-black">
              {stories.filter(s => !s.hasViewed).length}
            </span>
          </span>
        )}
      </div>

      {/* username */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={cn('text-white font-semibold truncate max-w-[70px] text-center', text)}>
          {author.username}
        </span>
        {/* expiry countdown */}
        {showExpiry && soonestExpiry !== Infinity && (
          <span className={cn(
            text,
            isUrgent ? 'text-red-400' : 'text-white/30'
          )}>
            {formatStoryCountdown(soonestExpiry)}
          </span>
        )}
      </div>
    </button>
  );
};

export default StoryRing;