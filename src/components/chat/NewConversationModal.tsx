import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, MessageCircle } from 'lucide-react';
import { friendshipsApi } from '@/api/friendships.api';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';

// NewConversationModal lets the user start a DM with any accepted friend
// It fetches the friends list and shows a searchable list
// Clicking a friend calls onSelect which tells ChatPage to open
// that conversation — no message is sent yet, just the conversation opens

interface NewConversationModalProps {
  onSelect: (userId: string, username: string, avatarUrl?: string | null) => void;
  onClose:  () => void;
}

const NewConversationModal = ({ onSelect, onClose }: NewConversationModalProps) => {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn:  () => friendshipsApi.list(),
  });

  const friends = data?.friendships || [];

  const filtered = friends.filter(f =>
    f.user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-3xl w-full max-w-sm overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#FFFC00]" />
            <h2 className="text-white font-black text-lg">New Message</h2>
          </div>
          <button
            onClick={onClose}
            title="Close modal"
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* search */}
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
            />
          </div>
        </div>

        {/* friend list */}
        <div className="max-h-72 overflow-y-auto py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-8 px-4">
              {friends.length === 0
                ? 'Add some friends first to start chatting'
                : 'No friends match your search'}
            </p>
          ) : (
            filtered.map(friendship => (
              <button
                key={friendship.id}
                onClick={() => {
                  onSelect(
                    friendship.user.id,
                    friendship.user.username,
                    friendship.user.avatarUrl
                  );
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors"
              >
                <Avatar
                  src={friendship.user.avatarUrl}
                  username={friendship.user.username}
                  size="md"
                />
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">
                    {friendship.user.username}
                  </p>
                  <p className="text-white/30 text-xs mt-0.5">Friend</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;