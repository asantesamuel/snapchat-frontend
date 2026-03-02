import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { groupsApi } from '@/api/groups.api';
import { useAuthStore } from '@/store/auth.store';

// useGroupManagement handles all operations on a group:
//   - fetching the group details and member list
//   - adding a new member (admin only)
//   - removing a member (admin only)
//   - leaving the group (any member)
//
// The "admin only" enforcement also happens on the backend —
// the frontend guards are purely UX, not security

export const useGroupManagement = (
  groupId: string,
  onLeft?: () => void   // callback when the current user leaves/group is deleted
) => {
  const queryClient   = useQueryClient();
  const { user: me }  = useAuthStore();
  const queryKey      = ['group', groupId];

  // ── Fetch group details ──────────────────────────────────────────
  const { data: group, isLoading } = useQuery({
    queryKey,
    queryFn:  () => groupsApi.get(groupId),
    enabled:  !!groupId,
  });

  // derive whether the current user is an admin of this group
  const myMembership = group?.members.find(m => m.userId === me?.id);
  const isAdmin      = myMembership?.role === 'admin';

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey });

  // ── Add a member ─────────────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: (username: string) =>
      groupsApi.addMember(groupId, { username }),
    onSuccess: () => {
      toast.success('Member added');
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not add member');
    },
  });

  // ── Remove a member ──────────────────────────────────────────────
  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      toast.success('Member removed');
      invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not remove member');
    },
  });

  // ── Leave group ──────────────────────────────────────────────────
  // uses the same removeMember endpoint with your own userId
  const leaveGroup = useMutation({
    mutationFn: () => groupsApi.removeMember(groupId, me!.id),
    onSuccess: () => {
      toast.success('You left the group');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onLeft?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not leave group');
    },
  });

  return {
    group,
    isLoading,
    isAdmin,
    myMembership,
    addMember:    addMember.mutate,
    removeMember: removeMember.mutate,
    leaveGroup:   leaveGroup.mutate,
    isAddingMember:   addMember.isPending,
    isRemovingMember: removeMember.isPending,
    isLeaving:        leaveGroup.isPending,
  };
};