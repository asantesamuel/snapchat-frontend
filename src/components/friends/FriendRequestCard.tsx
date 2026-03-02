import { Check, X, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/utils/time';
import Avatar from '@/components/ui/Avatar';
import type { PendingRequest } from '@/types/friendship.types';

// FriendRequestCard handles incoming requests
// it shows the requester's avatar, username, and when the request was sent
// two action buttons: accept (green checkmark) and reject (red X)
// the buttons disable while mutations are in flight to prevent double-clicks

interface FriendRequestCardProps {
  request:    PendingRequest;
  onAccept:   (id: string) => void;
  onReject:   (id: string) => void;
  isAccepting: boolean;
  isRejecting: boolean;
}

const FriendRequestCard = ({
  request,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: FriendRequestCardProps) => {
  const { requester } = request;
  const isProcessing  = isAccepting || isRejecting;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
      <Avatar src={requester.avatarUrl} username={requester.username} size="md" />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">
          {requester.username}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 text-white/25" />
          <p className="text-white/30 text-xs">
            {formatRelativeTime(request.createdAt)}
          </p>
        </div>
      </div>

      {/* accept / reject buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onReject(request.id)}
          disabled={isProcessing}
          title="Decline"
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/40 text-white/40 hover:text-red-400 transition-all disabled:opacity-40"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={() => onAccept(request.id)}
          disabled={isProcessing}
          title="Accept"
          className="w-9 h-9 rounded-full bg-[#FFFC00] flex items-center justify-center hover:bg-yellow-300 text-black transition-all active:scale-90 disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FriendRequestCard;