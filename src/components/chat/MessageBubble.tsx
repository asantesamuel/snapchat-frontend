import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, Flame, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatMessageTime } from '@/utils/time';
import type { Message } from '@/types/message.types';
import { MessageStatus, MessageType } from '@/types/message.types';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  onSeen: (messageId: string, mediaId?: string) => void;
  showAvatar?: boolean;
  senderAvatar?: string | null;
  senderUsername?: string;
}

// status icon shown inside sent messages
const StatusIcon = ({ status }: { status: MessageStatus }) => {
  if (status === MessageStatus.SENT)      return <Clock className="w-3 h-3 opacity-60" />;
  if (status === MessageStatus.DELIVERED) return <Check className="w-3 h-3 opacity-60" />;
  if (status === MessageStatus.READ)      return <CheckCheck className="w-3 h-3 text-[#FFFC00]" />;
  return null;
};

const MessageBubble = ({
  message,
  isMine,
  onSeen,
  showAvatar,
//   senderAvatar,
  senderUsername,
}: MessageBubbleProps) => {
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Intersection Observer — marks message as seen when it enters viewport
  useEffect(() => {
    if (isMine) return;
    if (message.status === MessageStatus.READ) return;
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
  }, [message.id, message.status, isMine, onSeen]);

  // ── Deleted / expired ephemeral ────────────────────────────────────
  if (message.status === MessageStatus.DELETED) {
    return (
      <div className={cn('flex items-end gap-2 mb-1', isMine ? 'flex-row-reverse' : 'flex-row')}>
        <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 max-w-xs">
          <div className="flex items-center gap-1.5 text-white/30 text-sm italic">
            <Flame className="w-3.5 h-3.5 text-red-500/50" />
            <span>Snap expired</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Ephemeral message — tap to view ───────────────────────────────
  if (message.isEphemeral && message.status !== MessageStatus.READ && !isMine) {
    return (
      <div ref={bubbleRef} className="flex items-end gap-2 mb-1">
        {showAvatar && (
          <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0">
            <span className="text-black text-xs font-black">
              {senderUsername?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        )}
        <button
          onClick={() => onSeen(message.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-2xl transition-all active:scale-95',
            'bg-gradient-to-r from-red-500/20 to-orange-500/20',
            'border border-red-500/40 hover:border-red-500/70',
          )}
        >
          <Flame className="w-4 h-4 text-red-400" />
          <div className="text-left">
            <p className="text-white text-sm font-semibold">Snap</p>
            <p className="text-white/40 text-xs">Tap to view — disappears after</p>
          </div>
          <Eye className="w-4 h-4 text-white/40 ml-1" />
        </button>
      </div>
    );
  }

  // ── Standard message bubble ────────────────────────────────────────
  return (
    <div
      ref={bubbleRef}
      className={cn(
        'flex items-end gap-2 mb-1 group',
        isMine ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* avatar — only for received messages in group chats */}
      {!isMine && showAvatar && (
        <div className="w-6 h-6 rounded-full bg-[#FFFC00] flex items-center justify-center shrink-0 mb-1">
          <span className="text-black text-xs font-black">
            {senderUsername?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
      )}
      {!isMine && !showAvatar && <div className="w-6 shrink-0" />}

      <div className="flex flex-col gap-0.5 max-w-[72%]">
        {/* sender name in group chats */}
        {!isMine && showAvatar && senderUsername && (
          <span className="text-xs text-white/40 ml-1">{senderUsername}</span>
        )}

        <div
          className={cn(
            'relative px-4 py-2.5 rounded-2xl',
            isMine
              ? [
                  'bg-[#FFFC00] text-black rounded-br-sm',
                  message.isEphemeral && 'bg-gradient-to-br from-[#FFFC00] to-orange-400',
                ]
              : 'bg-[#1C1C1E] text-white rounded-bl-sm',
          )}
        >
          {message.isEphemeral && (
            <Flame className={cn('w-3 h-3 inline mr-1.5', isMine ? 'text-orange-700' : 'text-orange-400')} />
          )}

          {/* text content */}
          {message.messageType === MessageType.TEXT && (
            <p className="text-sm leading-relaxed break-words">{message.content}</p>
          )}

          {/* timestamp + status row */}
          <div className={cn(
            'flex items-center gap-1 mt-0.5',
            isMine ? 'justify-end' : 'justify-start'
          )}>
            <span className={cn(
              'text-[10px]',
              isMine ? 'text-black/50' : 'text-white/30'
            )}>
              {formatMessageTime(message.sentAt)}
            </span>
            {isMine && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;