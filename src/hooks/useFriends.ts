import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { friendshipsApi } from '@/api/friendships.api';

// ── Query key constants ────────────────────────────────────────────────
// defined as constants so they are never mistyped as raw strings
// ['friends'] and ['friends', 'pending'] share a prefix
// so invalidating ['friends'] refreshes both simultaneously
export const FRIENDS_KEY  = ['friends']         as const;
export const PENDING_KEY  = ['friends', 'pending'] as const;

export const useFriends = () => {
  const queryClient = useQueryClient();

  // ── Fetch accepted friends ─────────────────────────────────────────
  const friendsQuery = useQuery({
    queryKey: FRIENDS_KEY,
    queryFn:  () => friendshipsApi.list(),
  });

  // ── Fetch incoming pending requests ───────────────────────────────
  const pendingQuery = useQuery({
    queryKey: PENDING_KEY,
    queryFn:  () => friendshipsApi.pending(),
  });

  // ── Helper: invalidate everything friends-related ──────────────────
  // called after any mutation so all components re-sync from server
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: FRIENDS_KEY });
  };

  // ── Send friend request ────────────────────────────────────────────
  const sendRequest = useMutation({
    mutationFn: (username: string) => friendshipsApi.send(username),
    onSuccess: () => {
      toast.success('Friend request sent!');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Could not send request');
    },
  });

  // ── Accept incoming request ────────────────────────────────────────
  const acceptRequest = useMutation({
    mutationFn: (id: string) => friendshipsApi.accept(id),
    onSuccess: (_, id) => {
      toast.success('Friend request accepted!');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not accept request');
    },
  });

  // ── Reject incoming request ────────────────────────────────────────
  const rejectRequest = useMutation({
    mutationFn: (id: string) => friendshipsApi.reject(id),
    onSuccess: () => {
      toast.success('Request declined');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not reject request');
    },
  });

  // ── Remove friend or cancel outgoing request ───────────────────────
  const removeFriend = useMutation({
    mutationFn: (id: string) => friendshipsApi.remove(id),
    onSuccess: () => {
      toast.success('Removed');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not remove friend');
    },
  });

  return {
    // data
    friends:        friendsQuery.data?.friendships ?? [],
    pendingRequests: pendingQuery.data?.requests   ?? [],
    friendCount:    friendsQuery.data?.total        ?? 0,
    pendingCount:   pendingQuery.data?.total        ?? 0,

    // loading states
    isLoadingFriends:  friendsQuery.isLoading,
    isLoadingPending:  pendingQuery.isLoading,

    // mutation functions — call these from components
    sendRequest:   sendRequest.mutate,
    acceptRequest: acceptRequest.mutate,
    rejectRequest: rejectRequest.mutate,
    removeFriend:  removeFriend.mutate,

    // individual mutation loading states — used to show spinners on buttons
    isSending:   sendRequest.isPending,
    isAccepting: acceptRequest.isPending,
    isRejecting: rejectRequest.isPending,
    isRemoving:  removeFriend.isPending,
  };
};