import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { storiesApi } from '@/api/stories.api';
import type { PublishStoryDto } from '@/types/story.types';

export const STORIES_FEED_KEY = ['stories', 'feed'] as const;
export const MY_STORIES_KEY   = ['stories', 'mine'] as const;

export const useStories = () => {
  const queryClient = useQueryClient();

  // ── Fetch the friend stories feed ─────────────────────────────────
  // returns StoryGroup[] — one entry per author with all their stories
  const feedQuery = useQuery({
    queryKey: STORIES_FEED_KEY,
    queryFn:  () => storiesApi.getFeed(),
    // stories change infrequently — 2 minute stale time is fine
    // the user can pull-to-refresh if they want fresh data
    staleTime: 2 * 60 * 1000,
  });

  // ── Fetch own stories ──────────────────────────────────────────────
  const myStoriesQuery = useQuery({
    queryKey: MY_STORIES_KEY,
    queryFn:  () => storiesApi.getMyStories(),
    staleTime: 2 * 60 * 1000,
  });

  // ── Publish a new story ────────────────────────────────────────────
  // dto contains mediaUrl, s3Key, storyType, visibility, allowedViewers
  const publishStory = useMutation({
    mutationFn: (dto: PublishStoryDto) => storiesApi.publish(dto),
    onSuccess: () => {
      // invalidate both the feed and my stories so they refresh
      queryClient.invalidateQueries({ queryKey: STORIES_FEED_KEY });
      queryClient.invalidateQueries({ queryKey: MY_STORIES_KEY });
      toast.success('Story posted! 🎉');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to publish story');
    },
  });

  // ── Delete own story ───────────────────────────────────────────────
  const deleteStory = useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORIES_FEED_KEY });
      queryClient.invalidateQueries({ queryKey: MY_STORIES_KEY });
      toast.success('Story deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not delete story');
    },
  });

  // ── Track story views — fire and forget ───────────────────────────
  // viewedInSession prevents duplicate view events in one page visit
  // using useRef because we do NOT want re-renders when this changes
  const viewedInSession = useRef<Set<string>>(new Set());

  const markViewed = useCallback((storyId: string) => {
    if (viewedInSession.current.has(storyId)) return;
    viewedInSession.current.add(storyId);

    // fire and forget — view tracking should never block the UI
    storiesApi.view(storyId)
      .then(() => {
        // optimistically mark as viewed in the local cache
        // this prevents the ring from staying yellow after viewing
        queryClient.setQueryData(STORIES_FEED_KEY, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            stories: old.stories.map((group: any) => ({
              ...group,
              stories: group.stories.map((s: any) =>
                s.id === storyId ? { ...s, hasViewed: true } : s
              ),
              // recalculate allViewed for this group
              allViewed: group.stories.every(
                (s: any) => s.id === storyId ? true : s.hasViewed
              ),
            })),
          };
        });
      })
      .catch(() => {
        // silently ignore — view tracking errors must not surface to user
      });
  }, [queryClient]);

  return {
    // feed data
    storyGroups:     feedQuery.data?.stories ?? [],
    isLoadingFeed:   feedQuery.isLoading,
    feedError:       feedQuery.error,
    refetchFeed:     feedQuery.refetch,

    // own stories
    myStories:       myStoriesQuery.data ?? [],
    isLoadingMine:   myStoriesQuery.isLoading,

    // actions
    publishStory:    publishStory.mutate,
    isPublishing:    publishStory.isPending,
    deleteStory:     deleteStory.mutate,
    isDeleting:      deleteStory.isPending,
    markViewed,
  };
};