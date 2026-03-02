import { UserMinus, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/ui/Avatar';
import type { Friendship } from '@/types/friendship.types';

// FriendCard renders a single accepted friend
// it has two actions: open a DM and remove from friends
// the onMessage callback navigates to the chat page with this friend's
// conversation pre-selected

interface FriendCardProps {
  friendship: Friendship;
  onRemove:   (id: string) => void;
  isRemoving: boolean;
}

const FriendCard = ({ friendship, onRemove, isRemoving }: FriendCardProps) => {
  const navigate = useNavigate();
  const { user } = friendship;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] rounded-2xl transition-colors group">
      {/* clicking the avatar navigates to their public profile */}
      <button 
        onClick={() => navigate(`/profile/${user.username}`)}
        title={`View ${user.username}'s profile`}
      >
        <Avatar src={user.avatarUrl} username={user.username} size="md" ring />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/profile/${user.username}`)}
          className="text-white font-semibold text-sm hover:text-[#FFFC00] transition-colors truncate block text-left"
        >
          {user.username}
        </button>
        <p className="text-white/30 text-xs mt-0.5">Friend</p>
      </div>

      {/* action buttons — appear on hover for a clean look */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* message shortcut — navigates to chat with this user */}
        <button
          onClick={() => navigate(`/chat/${friendship.id}`)}
          title="Send message"
          className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-[#FFFC00]/20 hover:text-[#FFFC00] text-white/40 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        {/* remove friend */}
        <button
          onClick={() => onRemove(friendship.id)}
          disabled={isRemoving}
          title="Remove friend"
          className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 text-white/40 transition-all disabled:opacity-40"
        >
          <UserMinus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FriendCard;