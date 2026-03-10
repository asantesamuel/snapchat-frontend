import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, UserPlus,
  MessageCircle, UserX, Loader2
} from 'lucide-react';
import { usersApi } from '@/api/users.api';
import { useAuthStore } from '@/store/auth.store';
import { useFriends } from '@/hooks/useFriends';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

// PublicProfilePage shows another user's profile
// it derives the username from the URL parameter (:username)
// the friendship action button is dynamic — its label and behaviour
// change based on the current relationship between the viewer
// and the profile owner:
//   - no relationship → "Add Friend"
//   - pending outgoing → "Requested" (cancel on click)
//   - already friends → "Friends" (remove on click)
//   - viewing own profile → redirect to /profile

const PublicProfilePage = () => {
  const { username }    = useParams<{ username: string }>();
  const navigate        = useNavigate();
  const { user: me }    = useAuthStore();
  const { friends, sendRequest, removeFriend, isSending } = useFriends();

  // redirect if viewing own profile
  if (username === me?.username) {
    navigate('/profile', { replace: true });
  }

  // fetch public profile data
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn:  () => usersApi.getProfile(username!),
    enabled:  !!username,
  });

  // check if this person is already a friend
  const existingFriendship = friends.find(f => f.user.username === username);
  const isFriend           = !!existingFriendship;

  const handleAddFriend = () => {
    if (!username) return;
    sendRequest(username);
  };

  const handleRemoveFriend = () => {
    if (!existingFriendship) return;
    removeFriend(existingFriendship.id);
  };

  const handleMessage = () => {
    // navigate to chat page — in a full implementation you would
    // pre-select this conversation; for now navigate to chat list
    navigate('/chat');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white font-bold text-lg">User not found</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          title="Go back"
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <p className="text-white/50 text-sm font-medium">{profile.username}</p>
        <div className="w-9" />
      </div>

      {/* ── Profile hero ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-4 pb-10">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-[#FFFC00]/15 blur-2xl scale-125" />
          <Avatar
            src={profile.avatarUrl}
            username={profile.username}
            size="xl"
            ring={isFriend}
            className="relative"
          />
        </div>

        <h1 className="text-white text-2xl font-black tracking-tight mb-1">
          {profile.username}
        </h1>

        <p className={cn(
          'text-center text-sm leading-relaxed max-w-xs mb-8',
          profile.bioText ? 'text-white/60' : 'text-white/20 italic'
        )}>
          {profile.bioText || 'No bio'}
        </p>

        {/* friendship action buttons */}
        <div className="flex gap-3 w-full max-w-xs">
          {isFriend ? (
            <>
              {/* message button — primary action for a friend */}
              <button
                onClick={handleMessage}
                title={`Message ${profile.username}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FFFC00] text-black font-bold text-sm hover:bg-yellow-300 active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Message
              </button>

              {/* remove friend — secondary destructive action */}
              <button
                onClick={handleRemoveFriend}
                title={`Remove ${profile.username} from friends`}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-white/50 font-bold text-sm hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all"
              >
                <UserX className="w-4 h-4" />
              </button>
            </>
          ) : (
            /* add friend — only action when not yet friends */
            <button
              onClick={handleAddFriend}
              disabled={isSending}
              title={`Add ${profile.username} as friend`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FFFC00] text-black font-bold text-sm hover:bg-yellow-300 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <UserPlus className="w-4 h-4" />}
              {isSending ? 'Sending...' : 'Add Friend'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;