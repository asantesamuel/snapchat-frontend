import {
  useReducer, useEffect, useRef, useCallback, useState
} from 'react';
import {
  X, ChevronLeft, ChevronRight,
  Eye, Clock, Lock, Globe, Trash2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatStoryCountdown } from '@/utils/time';
import StoryProgressBar from './StoryProgressBar';
import type { StoryGroup } from '@/types/story.types';
import { StoryType, StoryVisibility } from '@/types/story.types';
import { useAuthStore } from '@/store/auth.store';

// ── State machine ─────────────────────────────────────────────────────

interface ViewerState {
  authorIndex: number;   // which story group (friend) we are viewing
  storyIndex:  number;   // which story within that group
  progress:    number;   // 0.0 to 1.0 — drives the progress bar segment
  isPaused:    boolean;  // true while user holds the screen (long press)
}

type ViewerAction =
  | { type: 'NEXT_STORY' }
  | { type: 'PREV_STORY' }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'GO_TO'; authorIndex: number; storyIndex: number };

// The reducer handles ALL state transitions atomically
// No transition can leave the state in an inconsistent intermediate form
const createReducer = (groups: StoryGroup[]) =>
  (state: ViewerState, action: ViewerAction): ViewerState => {
    switch (action.type) {

      case 'NEXT_STORY': {
        const currentGroup = groups[state.authorIndex];
        if (!currentGroup) return state;

        // if there are more stories by this author, advance to the next one
        if (state.storyIndex < currentGroup.stories.length - 1) {
          return { ...state, storyIndex: state.storyIndex + 1, progress: 0 };
        }

        // otherwise advance to the next author
        if (state.authorIndex < groups.length - 1) {
          return {
            ...state,
            authorIndex: state.authorIndex + 1,
            storyIndex:  0,
            progress:    0,
          };
        }

        // we are at the end of all stories — signal close by returning
        // a special sentinel state (authorIndex === groups.length)
        return { ...state, authorIndex: groups.length, storyIndex: 0, progress: 0 };
      }

      case 'PREV_STORY': {
        if (state.storyIndex > 0) {
          return { ...state, storyIndex: state.storyIndex - 1, progress: 0 };
        }
        if (state.authorIndex > 0) {
          const prevGroup = groups[state.authorIndex - 1];
          return {
            ...state,
            authorIndex: state.authorIndex - 1,
            storyIndex:  prevGroup.stories.length - 1,
            progress:    0,
          };
        }
        // already at the very first story — restart it
        return { ...state, progress: 0 };
      }

      case 'SET_PROGRESS':
        return { ...state, progress: action.value };

      case 'PAUSE':
        return { ...state, isPaused: true };

      case 'RESUME':
        return { ...state, isPaused: false };

      case 'GO_TO':
        return {
          ...state,
          authorIndex: action.authorIndex,
          storyIndex:  action.storyIndex,
          progress:    0,
          isPaused:    false,
        };

      default:
        return state;
    }
  };

// ── Component ─────────────────────────────────────────────────────────

interface StoryViewerProps {
  groups:         StoryGroup[];
  initialAuthor:  number;         // which author to start with
  onClose:        () => void;
  onView:         (storyId: string) => void;
  onDelete:       (storyId: string) => void;
}

// default duration for image stories in milliseconds
const IMAGE_DURATION_MS = 5000;
// how often the progress timer ticks in milliseconds
const TICK_MS           = 100;

const StoryViewer = ({
  groups,
  initialAuthor,
  onClose,
  onView,
  onDelete,
}: StoryViewerProps) => {
  const { user: me }   = useAuthStore();
  const reducer        = useCallback((state: ViewerState, action: ViewerAction) => createReducer(groups)(state, action), [groups]);
  const videoRef       = useRef<HTMLVideoElement>(null);
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    authorIndex: initialAuthor,
    storyIndex:  0,
    progress:    0,
    isPaused:    false,
  });

  // ── Derived values ────────────────────────────────────────────────
  const currentGroup = groups[state.authorIndex];
  const currentStory = currentGroup?.stories[state.storyIndex];
  const isFinished   = state.authorIndex >= groups.length;
  const isMyStory    = currentStory?.author.id === me?.id;

  // story duration in ms: use video duration if available, else 5s for images
  const durationMs = currentStory
    ? (currentStory.duration
        ? Math.min(currentStory.duration, 60) * 1000
        : IMAGE_DURATION_MS)
    : IMAGE_DURATION_MS;

  // ── Close when finished ───────────────────────────────────────────
  useEffect(() => {
    if (isFinished) onClose();
  }, [isFinished, onClose]);

  // ── Mark story as viewed ──────────────────────────────────────────
  // fires once each time the active story changes
  useEffect(() => {
    if (!currentStory) return;
    onView(currentStory.id);
  }, [currentStory?.id]);

  // ── Progress timer ────────────────────────────────────────────────
  // runs every TICK_MS milliseconds
  // increments progress proportionally to the story's duration
  // when progress reaches 1.0, dispatches NEXT_STORY
  useEffect(() => {
    if (!currentStory || state.isPaused) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      return;
    }

    // reset video for video stories
    if (currentStory.storyType === StoryType.VIDEO && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }

    const increment = TICK_MS / durationMs;

    progressTimerRef.current = setInterval(() => {
      dispatch((prev: any) => {
        // this pattern passes a function to dispatch which reads current state
        // we need it because setInterval captures a stale closure otherwise
        return { type: 'SET_PROGRESS' };
      });

      // we manage progress directly instead of via the reducer closure
      // to avoid stale closures inside setInterval
    }, TICK_MS);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [currentStory?.id, state.isPaused, durationMs]);

  // ── Self-contained progress counter using a ref ───────────────────
  // Using a ref for the actual progress counter avoids the stale closure
  // problem with setInterval. The ref always has the current value.
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = 0;
    if (!currentStory) return;

    const increment = TICK_MS / durationMs;

    const timer = setInterval(() => {
      if (state.isPaused) return;

      progressRef.current = Math.min(progressRef.current + increment, 1);
      dispatch({ type: 'SET_PROGRESS', value: progressRef.current });

      if (progressRef.current >= 1) {
        clearInterval(timer);
        dispatch({ type: 'NEXT_STORY' });
        progressRef.current = 0;
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  // Re-run when story changes OR pause state changes
  }, [currentStory?.id, state.isPaused, durationMs]);

  // ── Touch / click handlers ────────────────────────────────────────
  // tap left third of screen → go back
  // tap right two thirds → go forward
  // hold → pause

  const handlePointerDown = () => {
    holdTimerRef.current = setTimeout(() => {
      dispatch({ type: 'PAUSE' });
    }, 200); // 200ms hold to pause
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (state.isPaused) dispatch({ type: 'RESUME' });
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.isPaused) return;
    const x           = e.clientX;
    const width       = e.currentTarget.offsetWidth;
    const tapFraction = x / width;

    if (tapFraction < 0.3) {
      dispatch({ type: 'PREV_STORY' });
    } else {
      dispatch({ type: 'NEXT_STORY' });
    }
  };

  if (!currentStory || !currentGroup) return null;

  const isImage = currentStory.storyType === StoryType.IMAGE;
  const isVideo = currentStory.storyType === StoryType.VIDEO;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* ── Story card ──────────────────────────────────────────── */}
      {/* centred with max width so it looks like a phone-sized story */}
      {/* on large monitors rather than stretching edge to edge       */}
      <div
        className="relative w-full h-full md:max-w-sm md:max-h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden bg-black"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTap}
        style={{ userSelect: 'none' }}
      >
        {/* ── Media ─────────────────────────────────────────────── */}
        {isImage && (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}

        {isVideo && (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="w-full h-full object-cover"
            playsInline
            muted={false}
            autoPlay
            loop={false}
            onEnded={() => dispatch({ type: 'NEXT_STORY' })}
          />
        )}

        {/* dark gradient overlays at top and bottom for readability */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* ── Progress bars ──────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <StoryProgressBar
            totalSegments={currentGroup.stories.length}
            activeIndex={state.storyIndex}
            progress={state.progress}
          />
        </div>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="absolute top-6 left-0 right-0 px-4 z-10 flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
            {/* author avatar */}
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#FFFC00] flex items-center justify-center ring-2 ring-white/30">
              {currentGroup.author.avatarUrl ? (
                <img
                  src={currentGroup.author.avatarUrl}
                  alt={currentGroup.author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-black text-sm font-black">
                  {currentGroup.author.username[0].toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <p className="text-white font-bold text-sm leading-tight">
                {currentGroup.author.username}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {/* expiry countdown */}
                <div className="flex items-center gap-1">
                  <Clock className={cn(
                    'w-3 h-3',
                    currentStory.secondsRemaining < 3600
                      ? 'text-red-400'
                      : 'text-white/50'
                  )} />
                  <span className={cn(
                    'text-[10px] font-medium',
                    currentStory.secondsRemaining < 3600
                      ? 'text-red-400'
                      : 'text-white/50'
                  )}>
                    {formatStoryCountdown(currentStory.secondsRemaining)}
                  </span>
                </div>

                {/* visibility badge */}
                {currentStory.visibility === StoryVisibility.CUSTOM ? (
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 text-[10px]">Custom</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 text-[10px]">Friends</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* right-side controls */}
          <div className="flex items-center gap-2">
            {/* view count — only visible on own stories */}
            {isMyStory && (
              <div className="flex items-center gap-1 bg-black/30 rounded-full px-2.5 py-1.5 backdrop-blur-sm">
                <Eye className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white text-xs font-semibold">
                  {currentStory.viewCount}
                </span>
              </div>
            )}

            {/* delete button — only visible on own stories */}
            {isMyStory && (
              <button
               title='delete-story'
                onClick={(e) => {
                  e.stopPropagation(); // prevent tap navigation
                  onDelete(currentStory.id);
                }}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white/70" />
              </button>
            )}

            {/* close button */}
            <button
                title='close-story'
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── Caption ────────────────────────────────────────────── */}
        {currentStory.caption && (
          <div className="absolute bottom-8 left-0 right-0 px-5 z-10">
            <p className="text-white text-sm font-medium text-center leading-relaxed drop-shadow-lg">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* ── Paused overlay ─────────────────────────────────────── */}
        {state.isPaused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                Hold
              </span>
            </div>
          </div>
        )}

        {/* ── Left / Right tap zones — invisible hit areas ──────── */}
        {/* These provide visual feedback arrows on hover            */}
        <div className="absolute inset-y-16 left-0 w-1/3 flex items-center pl-2 pointer-events-none">
          <ChevronLeft className="w-6 h-6 text-white/20" />
        </div>
        <div className="absolute inset-y-16 right-0 w-1/3 flex items-center justify-end pr-2 pointer-events-none">
          <ChevronRight className="w-6 h-6 text-white/20" />
        </div>
      </div>

      {/* ── Side navigation for desktop ───────────────────────── */}
      {/* on large screens, previous/next author arrows appear     */}
      {/* outside the story card itself                           */}
      <button
        title='prev-story'
        onClick={() => dispatch({ type: 'PREV_STORY' })}
        className="hidden md:flex absolute left-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center hover:bg-white/20 transition-colors"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        title='next-story'
        onClick={() => dispatch({ type: 'NEXT_STORY' })}
        className="hidden md:flex absolute right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center hover:bg-white/20 transition-colors"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
    </div>
  );
};

export default StoryViewer;