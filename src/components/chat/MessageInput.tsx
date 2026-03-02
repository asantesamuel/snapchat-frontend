import { useState, useRef } from 'react';
import { Send, Flame } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MessageInputProps {
  onSend:    (content: string, isEphemeral: boolean) => void;
  onTyping:  () => void;
  disabled?: boolean;
}

const MessageInput = ({ onSend, onTyping, disabled }: MessageInputProps) => {
  const [value, setValue]             = useState('');
  const [isEphemeral, setIsEphemeral] = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onTyping();
    // auto-grow the textarea up to 5 lines
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, isEphemeral);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] bg-black shrink-0">
      <div className={cn(
        'flex items-end gap-2 rounded-2xl border transition-all duration-200 px-3 py-2',
        isEphemeral
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-white/[0.08] bg-white/[0.03]',
      )}>

        {/* ephemeral toggle button */}
        <button
          type="button"
          onClick={() => setIsEphemeral(v => !v)}
          title={isEphemeral ? 'Snap mode ON' : 'Enable Snap mode'}
          className={cn(
            'mb-1 p-1.5 rounded-full transition-all shrink-0',
            isEphemeral
              ? 'text-red-400 bg-red-500/10'
              : 'text-white/15 hover:text-white/40'
          )}
        >
          <Flame className="w-5 h-5" />
        </button>

        {/* auto-growing textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isEphemeral ? '🔥 Send a snap...' : 'Send a message...'}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder:text-white/20 text-sm resize-none focus:outline-none leading-relaxed py-1 disabled:opacity-50"
        />

        {/* send button */}
        <button
        title='Send message'
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'mb-0.5 p-2 rounded-full transition-all duration-150 shrink-0',
            canSend
              ? 'bg-[#FFFC00] text-black hover:bg-yellow-300 active:scale-90'
              : 'bg-white/[0.04] text-white/15 cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* ephemeral hint */}
      {isEphemeral && (
        <p className="text-red-400/50 text-xs text-center mt-1.5 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3" />
          This message disappears after the recipient views it
        </p>
      )}
    </div>
  );
};

export default MessageInput;