import { useState } from 'react';
import { UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/utils/cn';
import type { PublicProfile } from '@/types/user.types';

// SearchResultCard shows a user from global search results
// the action button changes based on the current friendship state:
//   no relationship → "Add Friend" (UserPlus icon, yellow)
//   request sent    → "Requested"  (UserCheck icon, muted)
//   already friends → "Friends"    (UserCheck icon, green tint)
// this dynamic button is called a "contextual action button"
// it reads the friendship state from the component's local tracking
// and from the parent-supplied isFriend / hasSentRequest props

interface SearchResultCardProps {
  user:           PublicProfile;
  isFriend:       boolean;
  hasSentRequest: boolean;
  onAddFriend:    (username: string) => void;
  isSending:      boolean;
}

const SearchResultCard = ({
  user,
  isFriend,
  hasSentRequest,
  onAddFriend,
  isSending,
}: SearchResultCardProps) => {
  const navigate = useNavigate();
  // local state tracks if THIS card's request was just sent
  // so the button updates immediately without waiting for a refetch
  const [justSent, setJustSent] = useState(false);

  const handleAdd = () => {
    setJustSent(true);
    onAddFriend(user.username);
  };

  const isPending = hasSentRequest || justSent;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] rounded-2xl transition-colors">
      <button 
        onClick={() => navigate(`/profile/${user.username}`)}
        title={`View ${user.username}'s profile`}
      >
        <Avatar src={user.avatarUrl} username={user.username} size="md" />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/profile/${user.username}`)}
          className="text-white font-semibold text-sm hover:text-[#FFFC00] transition-colors truncate block text-left"
          title={`View ${user.username}'s profile`}
        >
          {user.username}
        </button>
        {user.bioText && (
          <p className="text-white/30 text-xs mt-0.5 truncate">{user.bioText}</p>
        )}
      </div>

      {/* contextual action button */}
      {isFriend ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <UserCheck className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400 text-xs font-semibold">Friends</span>
        </div>
      ) : isPending ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10">
          <UserCheck className="w-3.5 h-3.5 text-white/40" />
          <span className="text-white/40 text-xs font-semibold">Requested</span>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          title={`Add ${user.username} as friend`}
          disabled={isSending}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all',
            'bg-[#FFFC00]/10 border border-[#FFFC00]/30',
            'hover:bg-[#FFFC00]/20 hover:border-[#FFFC00]/50',
            'active:scale-95 disabled:opacity-50',
          )}
        >
          {isSending
            ? <Loader2 className="w-3.5 h-3.5 text-[#FFFC00] animate-spin" />
            : <UserPlus className="w-3.5 h-3.5 text-[#FFFC00]" />}
          <span className="text-[#FFFC00] text-xs font-semibold">
            {isSending ? 'Sending...' : 'Add'}
          </span>
        </button>
      )}
    </div>
  );
};

export default SearchResultCard;