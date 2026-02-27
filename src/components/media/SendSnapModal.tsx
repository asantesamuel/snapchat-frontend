import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, Check, Send, Flame } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import { friendshipsApi } from '@/api/friendships.api';
import { cn } from '@/utils/cn';

interface SendSnapModalProps {
  onSend:       (recipientIds: string[], isEphemeral: boolean) => void;
  onClose:      () => void;
  isUploading:  boolean;
}

const SendSnapModal = ({ onSend, onClose, isUploading }: SendSnapModalProps) => {
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [isEphemeral, setIsEphemeral] = useState(true); // snaps default to ephemeral

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn:  () => friendshipsApi.list(),
  });

  const friends = friendsData?.friendships || [];

  const filtered = friends.filter(f =>
    f.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={onClose}
          title="Close"
          className="text-white/50 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-black text-lg">Send To</h2>
        <div className="w-6" />
      </div>

      {/* ephemeral toggle */}
      <div className="px-5 mb-4">
        <button
          onClick={() => setIsEphemeral(v => !v)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all',
            isEphemeral
              ? 'bg-red-500/10 border-red-500/40 text-red-400'
              : 'bg-white/[0.04] border-white/[0.08] text-white/40'
          )}
        >
          <Flame className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-left">
            <p className={cn('text-sm font-bold', isEphemeral ? 'text-red-400' : 'text-white/60')}>
              {isEphemeral ? 'Snap Mode ON' : 'Snap Mode OFF'}
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              {isEphemeral
                ? 'Disappears after recipient views it'
                : 'Recipient can keep this forever'}
            </p>
          </div>
          <div className={cn(
            'w-10 h-6 rounded-full transition-all relative',
            isEphemeral ? 'bg-red-500' : 'bg-white/10'
          )}>
            <div className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all',
              isEphemeral ? 'right-1' : 'left-1'
            )} />
          </div>
        </button>
      </div>

      {/* search */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
          />
        </div>
      </div>

      {/* friend list */}
      <div className="flex-1 overflow-y-auto px-3">
        {filtered.length === 0 ? (
          <p className="text-white/25 text-sm text-center py-12">
            {friends.length === 0 ? 'Add friends to send snaps' : 'No friends found'}
          </p>
        ) : (
          filtered.map(f => {
            const isSelected = selected.has(f.user.id);
            return (
              <button
                key={f.id}
                onClick={() => toggle(f.user.id)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <Avatar src={f.user.avatarUrl} username={f.user.username} size="md" />
                <span className="text-white text-sm flex-1 text-left font-medium">
                  {f.user.username}
                </span>
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected ? 'bg-[#FFFC00] border-[#FFFC00]' : 'border-white/20'
                )}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* send button */}
      <div className="px-5 py-6">
        <Button
          size="lg"
          disabled={selected.size === 0}
          loading={isUploading}
          onClick={() => onSend(Array.from(selected), isEphemeral)}
          className="flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          {isUploading
            ? 'Uploading...'
            : `Send to ${selected.size} ${selected.size === 1 ? 'friend' : 'friends'}`}
        </Button>
      </div>
    </div>
  );
};

export default SendSnapModal;