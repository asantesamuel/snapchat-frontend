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
import { storiesApi } from '@/api/stories.api';

// ── State machine ──────────────────────────────────────────────────────────

interface ViewerState {
  authorIndex: number;
  storyIndex:  number;
  progress:    number;
  isPaused:    boolean;
}

type ViewerAction =
  | { type: 'NEXT_STORY' }
  | { type: 'PREV_STORY' }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'GO_TO'; authorIndex: number; storyIndex: number };

const createReducer = (groups: StoryGroup[]) =>
  (state: ViewerState, action: ViewerAction): ViewerState => {
    switch (action.type) {

      case 'NEXT_STORY': {
        const currentGroup = groups[state.authorIndex];
        if (!currentGroup) return state;

        if (state.storyIndex < currentGroup.stories.length - 1) {
          return { ...state, storyIndex: state.storyIndex + 1, progress: 0 };
        }
        if (state.authorIndex < groups.length - 1) {
          return {
            ...state,
            authorIndex: state.authorIndex + 1,
            storyIndex:  0,
            progress:    0,
          };
        }
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

// ── Component ──────────────────────────────────────────────────────────────

interface StoryViewerProps {
  groups:        StoryGroup[];
  initialAuthor: number;
  onClose:       () => void;
  onView:        (storyId: string) => void;
  onDelete:      (storyId: string) => void;
}

const IMAGE_DURATION_MS = 5000;
const TICK_MS           = 100;

const StoryViewer = ({
  groups,
  initialAuthor,
  onClose,
  onView,
  onDelete,
}: StoryViewerProps) => {
  const { user: me } = useAuthStore();
  const reducer      = useCallback(
    (state: ViewerState, action: ViewerAction) => createReducer(groups)(state, action),
    [groups]
  );

  const videoRef         = useRef<HTMLVideoElement>(null);
  const holdTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef      = useRef(0);

  const [state, dispatch] = useReducer(reducer, {
    authorIndex: initialAuthor,
    storyIndex:  0,
    progress:    0,
    isPaused:    false,
  });

  // ── Presigned URL state ──────────────────────────────────────────────────
  // WHY we need this:
  // story.mediaUrl is a bare S3 object URL — no AWS signature parameters.
  // Private S3 buckets return Access Denied for bare URLs, so using
  // story.mediaUrl directly as <img src> or <video src> results in a
  // dark screen. We call GET /api/stories/:id/url to receive a presigned
  // URL with a valid AWS4-HMAC-SHA256 signature that S3 will accept.
  //
  // WHY a Map keyed by storyId:
  // The viewer can navigate between multiple stories. Fetching a new
  // presigned URL on every story change (even when navigating back to
  // a story already seen) would be wasteful. Caching by storyId means
  // each story's URL is fetched once per viewer session. The presigned
  // URL is valid for 1 hour which is far longer than a typical viewing
  // session, so cached URLs do not expire during use.
  const [presignedUrls, setPresignedUrls] = useState<Map<string, string>>(new Map());
  const [isLoadingUrl, setIsLoadingUrl]   = useState(false);

  // ── Derived values ───────────────────────────────────────────────────────
  const currentGroup = groups[state.authorIndex];
  const currentStory = currentGroup?.stories[state.storyIndex];
  const isFinished   = state.authorIndex >= groups.length;
  const isMyStory    = currentStory?.author.id === me?.id;

  // the resolved URL to use as src — presigned if available, null while loading
  const mediaUrl = currentStory ? (presignedUrls.get(currentStory.id) ?? null) : null;

  const durationMs = currentStory
    ? (currentStory.duration
        ? Math.min(currentStory.duration, 60) * 1000
        : IMAGE_DURATION_MS)
    : IMAGE_DURATION_MS;

  // ── Fetch presigned URL whenever the active story changes ────────────────
  // Pauses progress while loading so the progress bar does not advance
  // while the image is still being fetched and the screen is dark.
  useEffect(() => {
    if (!currentStory) return;

    // already cached — no need to fetch again
    if (presignedUrls.has(currentStory.id)) return;

    let cancelled = false;

    const fetchUrl = async () => {
      setIsLoadingUrl(true);
      // pause progress bar while URL is loading so it does not advance
      // during the dark screen before the image appears
      dispatch({ type: 'PAUSE' });

      try {
        const { url } = await storiesApi.getSecureUrl(currentStory.id);

        if (cancelled) return;

        setPresignedUrls(prev => new Map(prev).set(currentStory.id, url));
        console.log('[Story] Presigned URL fetched:', {
          storyId: currentStory.id,
          url,
        });
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 410) {
          // story expired between feed load and tap — skip to next
          console.warn('[Story] Story expired, skipping:', currentStory.id);
          dispatch({ type: 'NEXT_STORY' });
        } else {
          console.error('[Story] Failed to fetch presigned URL:', err);
          // skip this story rather than showing a dark screen forever
          dispatch({ type: 'NEXT_STORY' });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUrl(false);
          dispatch({ type: 'RESUME' });
        }
      }
    };

    fetchUrl();

    return () => { cancelled = true; };
  }, [currentStory?.id]);

  // ── Close when finished ──────────────────────────────────────────────────
  useEffect(() => {
    if (isFinished) onClose();
  }, [isFinished, onClose]);

  // ── Mark story as viewed ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentStory) return;
    onView(currentStory.id);
  }, [currentStory?.id]);

  // ── Progress timer ───────────────────────────────────────────────────────
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
  }, [currentStory?.id, state.isPaused, durationMs]);

  // ── Touch / click handlers ───────────────────────────────────────────────
  const handlePointerDown = () => {
    holdTimerRef.current = setTimeout(() => {
      dispatch({ type: 'PAUSE' });
    }, 200);
  };

  const handlePointerUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (state.isPaused) dispatch({ type: 'RESUME' });
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state.isPaused) return;
    const tapFraction = e.clientX / e.currentTarget.offsetWidth;
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
      <div
        className="relative w-full h-full md:max-w-sm md:max-h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden bg-black"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTap}
        style={{ userSelect: 'none' }}
      >
        {/* ── Media ───────────────────────────────────────────────── */}
        {/* mediaUrl is null while the presigned URL is being fetched.  */}
        {/* We show a loading spinner instead of a dark blank screen.   */}
        {!mediaUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
          </div>
        ) : (
          <>
            {isImage && (
              <img
                key={currentStory.id}
                src={mediaUrl}
                alt="Story"
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}

            {isVideo && (
              <video
                key={currentStory.id}
                ref={videoRef}
                src={mediaUrl}
                className="w-full h-full object-cover"
                playsInline
                muted={false}
                autoPlay
                loop={false}
                onEnded={() => dispatch({ type: 'NEXT_STORY' })}
              />
            )}
          </>
        )}

        {/* dark gradient overlays for readability */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* ── Progress bars ────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
          <StoryProgressBar
            totalSegments={currentGroup.stories.length}
            activeIndex={state.storyIndex}
            progress={state.progress}
          />
        </div>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="absolute top-6 left-0 right-0 px-4 z-10 flex items-center justify-between mt-1">
          <div className="flex items-center gap-2.5">
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

          <div className="flex items-center gap-2">
            {isMyStory && (
              <div className="flex items-center gap-1 bg-black/30 rounded-full px-2.5 py-1.5 backdrop-blur-sm">
                <Eye className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white text-xs font-semibold">
                  {currentStory.viewCount}
                </span>
              </div>
            )}

            {isMyStory && (
              <button
                title="delete-story"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(currentStory.id);
                }}
                className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white/70" />
              </button>
            )}

            <button
              title="close-story"
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

        {/* ── Caption ─────────────────────────────────────────────── */}
        {currentStory.caption && (
          <div className="absolute bottom-8 left-0 right-0 px-5 z-10">
            <p className="text-white text-sm font-medium text-center leading-relaxed drop-shadow-lg">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* ── Paused overlay ───────────────────────────────────────── */}
        {state.isPaused && !isLoadingUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-white text-xs font-bold uppercase tracking-wider">
                Hold
              </span>
            </div>
          </div>
        )}

        {/* ── Left / Right tap zone arrows ────────────────────────── */}
        <div className="absolute inset-y-16 left-0 w-1/3 flex items-center pl-2 pointer-events-none">
          <ChevronLeft className="w-6 h-6 text-white/20" />
        </div>
        <div className="absolute inset-y-16 right-0 w-1/3 flex items-center justify-end pr-2 pointer-events-none">
          <ChevronRight className="w-6 h-6 text-white/20" />
        </div>
      </div>

      {/* ── Side navigation for desktop ─────────────────────────── */}
      <button
        title="prev-story"
        onClick={() => dispatch({ type: 'PREV_STORY' })}
        className="hidden md:flex absolute left-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm items-center justify-center hover:bg-white/20 transition-colors"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        title="next-story"
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