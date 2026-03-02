import { useState, useRef, useEffect } from 'react';
import { Flame, Eye, Play, Mic, CheckCheck, Check, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatMessageTime } from '@/utils/time';
import type { Message } from '@/types/message.types';
import { MessageStatus, MessageType } from '@/types/message.types';

// MediaMessageBubble renders image, video, and audio messages
// It handles three distinct states for each ephemeral media message:
//
//   STATE 1 — UNOPENED (isEphemeral && not yet seen by recipient)
//     Shows a "tap to view" button. Recipient has not viewed yet.
//     The actual media URL is NOT loaded — protecting privacy.
//
//   STATE 2 — VIEWING (recipient tapped, media is loading/playing)
//     Shows the actual image/video/audio. Marks as seen immediately.
//     For video/audio: plays with a countdown timer.
//
//   STATE 3 — EXPIRED (seen, deleted on backend)
//     Shows "Snap expired" placeholder. Content is gone.
//
// Non-ephemeral media skips straight to STATE 2 (always visible).

interface MediaMessageBubbleProps {
  message:         Message;
  isMine:          boolean;
  onSeen:          (messageId: string, mediaId?: string) => void;
  showAvatar?:     boolean;
  senderUsername?: string;
}

// status icon for sent messages
const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === MessageStatus.SENT)      return <Clock    className="w-3 h-3 opacity-50" />;
  if (status === MessageStatus.DELIVERED) return <Check    className="w-3 h-3 opacity-50" />;
  if (status === MessageStatus.READ)      return <CheckCheck className="w-3 h-3 text-[#FFFC00]" />;
  return null;
};

const MediaMessageBubble = ({
  message,
  isMine,
  onSeen,
  showAvatar,
  senderUsername,
}: MediaMessageBubbleProps) => {
  // tracks whether THIS viewer has tapped to open an ephemeral media
  // separate from message.status because the sender's copy should show
  // "delivered" not "viewing" from the sender's perspective
  const [hasOpenedLocally, setHasOpenedLocally] = useState(false);
  const [isPlaying, setIsPlaying]               = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // for non-ephemeral received media, mark as seen when it enters viewport
  // same Intersection Observer pattern as MessageBubble
  useEffect(() => {
    if (isMine)                                    return;
    if (message.isEphemeral)                       return; // handled by tap
    if (message.status === MessageStatus.READ)     return;
    if (message.status === MessageStatus.DELETED)  return;

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
  }, [message.id, message.status, isMine, message.isEphemeral, onSeen]);

  // ── STATE 3: Deleted/expired ─────────────────────────────────────
  if (message.status === MessageStatus.DELETED) {
    return (
      <div className={cn(
        'flex items-end gap-2 mb-1',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}>
        <div className="px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] max-w-xs">
          <div className="flex items-center gap-1.5 text-white/20 text-sm italic">
            <Flame className="w-3.5 h-3.5 text-red-500/40 shrink-0" />
            <span>Snap expired</span>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 1: Ephemeral tap-to-view (received, not yet opened) ────
  if (message.isEphemeral && !isMine && !hasOpenedLocally) {
    const mediaLabel =
      message.messageType === MessageType.IMAGE ? 'Photo Snap' :
      message.messageType === MessageType.VIDEO ? 'Video Snap' :
      'Audio Note';

    const mediaIcon =
      message.messageType === MessageType.AUDIO
        ? <Mic  className="w-5 h-5 text-red-400" />
        : <Flame className="w-5 h-5 text-red-400" />;

    return (
      <div ref={bubbleRef} className="flex items-end gap-2 mb-1">
        {showAvatar && senderUsername && (
          <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0">
            <span className="text-black text-xs font-black">
              {senderUsername[0].toUpperCase()}
            </span>
          </div>
        )}
        {!showAvatar && <div className="w-6 shrink-0" />}

        {/* tap-to-view button */}
        <button
          onClick={() => {
            setHasOpenedLocally(true);
            onSeen(message.id);
          }}
          title={`Open ${mediaLabel}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-95',
            'bg-gradient-to-r from-red-950/60 to-orange-950/60',
            'border border-red-500/30 hover:border-red-500/60',
            'shadow-[inset_0_1px_0_rgba(255,100,50,0.1)]'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
            {mediaIcon}
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">{mediaLabel}</p>
            <p className="text-white/40 text-xs mt-0.5 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Tap to open · disappears after viewing
            </p>
          </div>
        </button>
      </div>
    );
  }

  // ── STATE 2: Show the actual media content ────────────────────────
  // applies to: non-ephemeral received, all sent, locally-opened ephemeral
  const mediaUrl = message.content; // content holds the S3 URL for media messages

  if (!mediaUrl) return null;

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'flex items-end gap-2 mb-1',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isMine && showAvatar && senderUsername && (
        <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0 mb-1">
          <span className="text-black text-xs font-black">
            {senderUsername[0].toUpperCase()}
          </span>
        </div>
      )}
      {!isMine && !showAvatar && <div className="w-6 shrink-0" />}

      <div className={cn(
        'relative overflow-hidden rounded-2xl max-w-xs',
        isMine ? 'rounded-br-sm' : 'rounded-bl-sm',
        message.isEphemeral && 'ring-2 ring-red-500/30'
      )}>

        {/* ── IMAGE ─────────────────────────────────────────────── */}
        {message.messageType === MessageType.IMAGE && (
          <div className="relative">
            <img
              src={mediaUrl}
              alt="Snap"
              className="w-full max-w-[240px] object-cover rounded-2xl"
              style={{ maxHeight: '320px' }}
            />
            {message.isEphemeral && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
                <Flame className="w-3 h-3 text-red-400" />
                <span className="text-white text-[10px] font-bold">Snap</span>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEO ─────────────────────────────────────────────── */}
        {message.messageType === MessageType.VIDEO && (
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ maxWidth: '240px' }}>
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full object-cover"
              style={{ maxHeight: '320px' }}
              playsInline
              loop={message.isEphemeral}
              controls={!message.isEphemeral}
              autoPlay={hasOpenedLocally}
            />
            {!isPlaying && !message.isEphemeral && (
              <button
                onClick={() => {
                  videoRef.current?.play();
                  setIsPlaying(true);
                }}
                title="Play video"
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </button>
            )}
            {message.isEphemeral && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-2 py-1">
                <Flame className="w-3 h-3 text-red-400" />
              </div>
            )}
          </div>
        )}

        {/* ── AUDIO ─────────────────────────────────────────────── */}
        {message.messageType === MessageType.AUDIO && (
          <div className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-2xl',
            isMine ? 'bg-[#FFFC00]' : 'bg-[#1C1C1E]'
          )}>
            <div className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
              isMine ? 'bg-black/15' : 'bg-white/10'
            )}>
              <Mic className={cn('w-4 h-4', isMine ? 'text-black' : 'text-white/70')} />
            </div>
            <div className="flex-1 min-w-0">
              <audio src={mediaUrl} controls className="w-full h-8 opacity-80" />
            </div>
            {message.isEphemeral && (
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
            )}
          </div>
        )}

        {/* timestamp + status */}
        <div className={cn(
          'absolute bottom-2 right-2 flex items-center gap-1',
          'bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5',
          message.messageType === MessageType.AUDIO && 'static bg-transparent backdrop-blur-none mt-1 px-1 justify-end'
        )}>
          <span className="text-white text-[10px] opacity-80">
            {formatMessageTime(message.sentAt)}
          </span>
          {isMine && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
};

export default MediaMessageBubble;