import { useState, useRef, useEffect } from 'react';
import {
  Flame, Eye, Play, Mic,
  CheckCheck, Check, Clock,
  Volume2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatMessageTime } from '@/utils/time';
import { mediaApi } from '@/api/media.api';
import type { Message } from '@/types/message.types';
import { MessageStatus, MessageType } from '@/types/message.types';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// MediaMessageBubble renders image, video, and audio messages.
//
// EPHEMERAL STATE MACHINE (received messages only)
// ─────────────────────────────────────────────────
//
//  STATE 1 — SEALED
//    Condition: message.isEphemeral && !isMine && !hasOpenedLocally
//    Renders:   "Tap to open · disappears after viewing" button
//    URL:       nothing is loaded yet (privacy preserved)
//
//  STATE 2 — LOADING
//    Condition: isLoadingSecureUrl === true
//    Renders:   spinner inside the sealed button while the backend
//               generates the presigned GET URL
//
//  STATE 3 — VIEWING
//    Condition: hasOpenedLocally && savedMediaUrl !== null
//    Renders:   The actual image / video / audio
//    URL:       savedMediaUrl — the presigned GET URL from the backend,
//               stored in local state and immune to Zustand store updates
//    On load:   fires onSeen → backend nullifies message.content
//               starts 3-second expiry countdown
//
//  STATE 4 — EXPIRING
//    Condition: isExpiring && !hasExpired
//    Renders:   The media with a red countdown overlay (3 → 2 → 1)
//
//  STATE 5 — EXPIRED
//    Condition: message.status === DELETED || hasExpired
//    Renders:   "Snap expired" placeholder
//
// NON-EPHEMERAL received messages:
//   No sealed state. We fetch the presigned URL on mount via a useEffect
//   so the image is ready to display as soon as the bubble renders.
//
// WHY savedMediaUrl instead of message.content?
// ──────────────────────────────────────────────
// message.content holds the bare S3 object URL with no AWS signature.
// Private S3 buckets return Access Denied for bare URLs.
// We call GET /api/media/:mediaId/url to get a presigned GET URL that
// carries X-Amz-Signature and related parameters. S3 validates the
// signature and serves the object. This presigned URL is stored in
// local component state (savedMediaUrl). It is completely unaffected
// by Zustand store updates that null out message.content when the
// backend fires message_deleted.
//
// WHY onSeen fires on load, not on tap?
// ──────────────────────────────────────
// Tapping fetches the presigned URL and triggers the image to load.
// Confirming "seen" should only happen when the image is actually
// visible on screen. Emitting MESSAGE_SEEN on tap would start backend
// deletion before the browser has finished loading the image bytes.
// On slow connections the content would be deleted before it renders.
// We fire onSeen from img.onLoad / video.onLoadedData / audio.onCanPlay.
//
// WHY a 3-second countdown before expiry?
// ─────────────────────────────────────────
// The message_deleted socket event often arrives within milliseconds of
// onSeen. Without a local countdown the bubble would show "Snap expired"
// almost immediately. The 3-second window is enforced locally. We only
// honour message.status === DELETED once hasExpired is also true.
// ─────────────────────────────────────────────────────────────────────────────

interface MediaMessageBubbleProps {
  message:          Message;
  isMine:           boolean;
  onSeen:           (messageId: string, mediaId?: string) => void;
  showAvatar?:      boolean;
  senderUsername?:  string;
}

// ── Status icon (sender's side only) ────────────────────────────────────────

const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === MessageStatus.SENT)
    return <Clock className="w-3 h-3 text-white/30" />;
  if (status === MessageStatus.DELIVERED)
    return <Check className="w-3 h-3 text-white/40" />;
  if (status === MessageStatus.READ)
    return <CheckCheck className="w-3 h-3 text-[#FFFC00]" />;
  return null;
};

// ── Main component ───────────────────────────────────────────────────────────

const MediaMessageBubble = ({
  message,
  isMine,
  onSeen,
  showAvatar,
  senderUsername,
}: MediaMessageBubbleProps) => {

  // Whether the recipient has tapped to open an ephemeral media this session.
  const [hasOpenedLocally, setHasOpenedLocally] = useState(false);

  // The presigned GET URL fetched from the backend.
  // Immune to Zustand store updates that null out message.content.
  const [savedMediaUrl, setSavedMediaUrl] = useState<string | null>(null);

  // True while waiting for the backend to return the presigned URL.
  // Shows a spinner so the user knows the tap registered.
  const [isLoadingSecureUrl, setIsLoadingSecureUrl] = useState(false);

  // Whether the 3-second post-view countdown has begun.
  const [isExpiring, setIsExpiring] = useState(false);

  // Whether the local expiry countdown has finished.
  // Only after this is true do we honour message.status === DELETED.
  const [hasExpired, setHasExpired] = useState(false);

  // Countdown seconds remaining (3 → 2 → 1).
  const [countdown, setCountdown] = useState(3);

  // Controls the play button overlay on non-ephemeral video.
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const bubbleRef      = useRef<HTMLDivElement>(null);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup timers on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current)  clearTimeout(expiryTimerRef.current);
      if (countdownRef.current)    clearInterval(countdownRef.current);
    };
  }, []);

  // ── Auto-fetch presigned URL for non-ephemeral media ──────────────────────
  // Non-ephemeral messages have no sealed state — the image should display
  // immediately when the bubble mounts. Ephemeral messages skip this and
  // wait for the user's tap instead.
  // Senders also benefit from this: their own messages use message.content
  // as a fallback (see mediaUrl below) but fetching a presigned URL ensures
  // the image actually loads from the private bucket.
  useEffect(() => {
    if (message.isEphemeral && !isMine) return; // ephemeral waits for tap
    if (savedMediaUrl)                  return; // already fetched
    if (!message.mediaId)               return; // text message, skip
    if (message.status === MessageStatus.DELETED) return;

    const fetchUrl = async () => {
      try {
        const { url } = await mediaApi.getSecureUrl(message.mediaId!);
        setSavedMediaUrl(url);
        console.log('[Media] Presigned URL fetched on mount:', {
          messageId: message.id,
          mediaId:   message.mediaId,
        });
      } catch (err: any) {
        if (err?.response?.status === 410) {
          setHasExpired(true);
        }
        console.error('[Media] Failed to fetch presigned URL on mount:', err);
      }
    };

    fetchUrl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  // ── Intersection Observer for non-ephemeral received messages ─────────────
  useEffect(() => {
    if (isMine)                                   return;
    if (message.isEphemeral)                      return;
    if (message.status === MessageStatus.READ)    return;
    if (message.status === MessageStatus.DELETED) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onSeen(message.id);
          observer.disconnect();
        }
      },
      { threshold: 0.8 }
    );

    if (bubbleRef.current) observer.observe(bubbleRef.current);
    return () => observer.disconnect();
  }, [message.id, message.status, message.isEphemeral, isMine, onSeen]);

  // ── Tap to view handler ───────────────────────────────────────────────────
  // THE KEY CHANGE from the previous version:
  // Instead of reading message.content (bare S3 URL → Access Denied),
  // we call mediaApi.getSecureUrl(message.mediaId) which hits the backend
  // endpoint GET /api/media/:id/url. The backend verifies the requester
  // has access, calls generateDownloadPresignedUrl(media.s3Key, 300),
  // and returns a URL with a valid AWS4-HMAC-SHA256 signature.
  //
  // CRITICAL ORDER:
  //   1. setIsLoadingSecureUrl(true)  → show spinner in sealed button
  //   2. await mediaApi.getSecureUrl  → backend generates presigned URL
  //   3. setSavedMediaUrl(url)        → lock URL into local state
  //   4. setHasOpenedLocally(true)    → trigger re-render to STATE 3
  //   5. onSeen called from handleMediaLoaded after image finishes loading
  const handleTapToView = async () => {
    if (!message.mediaId)    return;
    if (isLoadingSecureUrl)  return; // prevent double-tap

    setIsLoadingSecureUrl(true);

    try {
      const { url } = await mediaApi.getSecureUrl(message.mediaId);

      // setSavedMediaUrl BEFORE setHasOpenedLocally so the URL is
      // available the moment the component re-renders to STATE 3
      setSavedMediaUrl(url);
      setHasOpenedLocally(true);

      console.log('[Ephemeral] Tap to view — presigned URL fetched:', {
        messageId: message.id,
        mediaId:   message.mediaId,
        urlToSave: url,
      });
      // onSeen is called from handleMediaLoaded, not here

    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 410) {
        // Media already deleted on the backend — go straight to expired
        setHasExpired(true);
        console.warn('[Ephemeral] Media already deleted:', message.mediaId);
      } else if (status === 403) {
        toast.error('You do not have permission to view this snap.');
        console.error('[Ephemeral] Access denied:', message.mediaId);
      } else {
        toast.error('Could not load snap. Please try again.');
        console.error('[Ephemeral] Failed to fetch presigned URL:', err);
      }
    } finally {
      setIsLoadingSecureUrl(false);
    }
  };

  // ── Media loaded handler ──────────────────────────────────────────────────
  // Called by img.onLoad / video.onLoadedData / audio.onCanPlay.
  // This is the correct moment to fire onSeen — the media is visible.
  const handleMediaLoaded = () => {
    if (!message.isEphemeral || !hasOpenedLocally) return;
    if (isMine) return;

    console.log('[Ephemeral] Media loaded, marking as seen:', { messageId: message.id });
    onSeen(message.id, message.mediaId ?? undefined);

    startExpiryCountdown();
  };

  // ── Expiry countdown ──────────────────────────────────────────────────────
  const startExpiryCountdown = () => {
    setIsExpiring(true);
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    expiryTimerRef.current = setTimeout(() => {
      setHasExpired(true);
      setIsExpiring(false);
    }, 3000);
  };

  // ── Resolve which URL to use for rendering ────────────────────────────────
  // savedMediaUrl covers all cases once the presigned URL has been fetched:
  //   - Non-ephemeral: fetched on mount via useEffect above
  //   - Ephemeral received: fetched on tap via handleTapToView
  //   - Sender's own messages: fetched on mount via useEffect above
  // The isMine fallback to message.content handles the brief window before
  // the on-mount fetch completes for senders.
  const mediaUrl = savedMediaUrl ?? (isMine ? message.content : null);

  // Debug log for STATE 3 entry
  useEffect(() => {
    if (message.isEphemeral && hasOpenedLocally && savedMediaUrl) {
      console.log('[Ephemeral] STATE 3: Viewing image', {
        messageId:     message.id,
        savedMediaUrl,
      });
      try {
        new URL(savedMediaUrl);
        console.log('[Ephemeral] savedMediaUrl is a valid URL ✓');
      } catch {
        console.error('[Ephemeral] savedMediaUrl is NOT a valid URL ✗', savedMediaUrl);
      }
    }
  }, [message.isEphemeral, hasOpenedLocally, savedMediaUrl, message.id]);

  // ── STATE 5: Expired ──────────────────────────────────────────────────────
  const isDeleted =
    message.status === MessageStatus.DELETED && (hasExpired || !hasOpenedLocally);

  if (isDeleted || hasExpired) {
    return (
      <div className={cn(
        'flex items-end gap-2 mb-1',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}>
        <div className="w-6 shrink-0" />
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <Flame className="w-3.5 h-3.5 text-red-500/40 shrink-0" />
          <span className="text-white/20 text-sm italic">
            {isMine ? 'Snap opened' : 'Snap expired'}
          </span>
        </div>
      </div>
    );
  }

  // ── STATE 1 + 2: Sealed / Loading (ephemeral, received, not yet opened) ───
  if (message.isEphemeral && !isMine && !hasOpenedLocally) {
    const label =
      message.messageType === MessageType.IMAGE ? 'Photo Snap'  :
      message.messageType === MessageType.VIDEO ? 'Video Snap'  :
      'Audio Note';

    const icon =
      message.messageType === MessageType.AUDIO
        ? <Mic   className="w-5 h-5 text-red-400" />
        : <Flame className="w-5 h-5 text-red-400" />;

    return (
      <div ref={bubbleRef} className="flex items-end gap-2 mb-1">
        {showAvatar && senderUsername ? (
          <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0 mb-1">
            <span className="text-black text-[10px] font-black">
              {senderUsername[0].toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        <button
          onClick={handleTapToView}
          disabled={isLoadingSecureUrl}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-2xl',
            'transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait',
            'bg-gradient-to-r from-red-950/60 to-orange-950/60',
            'border border-red-500/30 hover:border-red-500/60',
            'shadow-[inset_0_1px_0_rgba(255,100,50,0.1)]'
          )}
        >
          {/* Spinner replaces icon while presigned URL is loading */}
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            {isLoadingSecureUrl
              ? <div className="w-5 h-5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
              : icon
            }
          </div>

          <div className="text-left">
            <p className="text-white font-bold text-sm">{label}</p>
            <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
              <Eye className="w-3 h-3 shrink-0" />
              {isLoadingSecureUrl
                ? 'Opening snap...'
                : 'Tap to open · disappears after viewing'
              }
            </p>
          </div>
        </button>
      </div>
    );
  }

  // ── Loading placeholder for non-ephemeral media awaiting presigned URL ─────
  if (!mediaUrl) {
    return (
      <div className={cn(
        'flex items-end gap-2 mb-1',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}>
        {!isMine && <div className="w-6 shrink-0" />}
        <div className="w-[200px] h-[140px] rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        </div>
      </div>
    );
  }

  // ── STATES 3 & 4: Media visible (viewing or expiring) ────────────────────

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'flex items-end gap-2 mb-1',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isMine && (
        showAvatar && senderUsername ? (
          <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0 mb-1">
            <span className="text-black text-[10px] font-black">
              {senderUsername[0].toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="w-6 shrink-0" />
        )
      )}

      <div className={cn(
        'relative overflow-hidden rounded-2xl max-w-[260px]',
        isMine ? 'rounded-br-sm' : 'rounded-bl-sm',
        message.isEphemeral && hasOpenedLocally && !hasExpired
          && 'ring-2 ring-red-500/50'
      )}>

        {/* ── IMAGE ─────────────────────────────────────────────────── */}
        {message.messageType === MessageType.IMAGE && (
          <div className="relative">
            <img
              src={mediaUrl}
              alt="Snap"
              draggable={false}
              onLoad={handleMediaLoaded}
              onError={e => {
                console.error('[Media] Image failed to load:', mediaUrl, e);
              }}
              className="w-full object-cover rounded-2xl block"
              style={{ maxWidth: 260, maxHeight: 340 }}
            />

            {message.isEphemeral && !hasExpired && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm">
                <Flame className="w-3 h-3 text-red-400" />
                {isExpiring && (
                  <span className="text-red-400 text-[10px] font-black">
                    {countdown}
                  </span>
                )}
              </div>
            )}

            {isExpiring && (
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background:
                    'radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.25) 100%)',
                }}
              />
            )}
          </div>
        )}

        {/* ── VIDEO ─────────────────────────────────────────────────── */}
        {message.messageType === MessageType.VIDEO && (
          <div
            className="relative bg-black rounded-2xl overflow-hidden"
            style={{ maxWidth: 260 }}
          >
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full object-cover block"
              style={{ maxHeight: 340 }}
              playsInline
              loop={message.isEphemeral}
              controls={!message.isEphemeral}
              autoPlay={hasOpenedLocally}
              onLoadedData={handleMediaLoaded}
              onPlay={() => setIsPlaying(true)}
            />

            {!isPlaying && !message.isEphemeral && (
              <button
                title="play"
                onClick={() => {
                  videoRef.current?.play();
                  setIsPlaying(true);
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity hover:bg-black/30"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              </button>
            )}

            {message.isEphemeral && !hasExpired && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1 backdrop-blur-sm">
                <Flame className="w-3 h-3 text-red-400" />
                {isExpiring && (
                  <span className="text-red-400 text-[10px] font-black">
                    {countdown}
                  </span>
                )}
              </div>
            )}

            {isExpiring && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.25) 100%)',
                }}
              />
            )}
          </div>
        )}

        {/* ── AUDIO ─────────────────────────────────────────────────── */}
        {message.messageType === MessageType.AUDIO && (
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl min-w-[200px]',
            isMine
              ? 'bg-[#FFFC00]'
              : 'bg-[#1C1C1E] border border-white/[0.08]'
          )}>
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
              isMine ? 'bg-black/15' : 'bg-white/10'
            )}>
              {isExpiring
                ? <Flame className="w-4 h-4 text-red-400" />
                : <Volume2 className={cn(
                    'w-4 h-4',
                    isMine ? 'text-black/70' : 'text-white/60'
                  )} />
              }
            </div>

            <div className="flex-1 min-w-0">
              <audio
                src={mediaUrl}
                controls
                onCanPlay={handleMediaLoaded}
                className="w-full h-8"
                style={{ opacity: 0.85 }}
              />
            </div>

            {message.isEphemeral && !hasExpired && (
              <div className="flex items-center gap-1 shrink-0">
                <Flame className="w-4 h-4 text-red-400" />
                {isExpiring && (
                  <span className="text-red-400 text-xs font-black">
                    {countdown}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Timestamp + status row ────────────────────────────────── */}
        {message.messageType !== MessageType.AUDIO ? (
          <div className={cn(
            'absolute bottom-2 flex items-center gap-1',
            isMine ? 'right-2' : 'left-2',
            'bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5'
          )}>
            <span className="text-white text-[10px] opacity-80">
              {formatMessageTime(message.sentAt)}
            </span>
            {isMine && <StatusIcon status={message.status} />}
          </div>
        ) : (
          <div className={cn(
            'flex items-center gap-1 justify-end px-1 pt-1',
            isMine ? 'text-black/40' : 'text-white/30'
          )}>
            <span className="text-[10px]">
              {formatMessageTime(message.sentAt)}
            </span>
            {isMine && <StatusIcon status={message.status} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaMessageBubble;