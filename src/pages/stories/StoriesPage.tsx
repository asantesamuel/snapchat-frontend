import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, BookOpen, Camera } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useStories } from '@/hooks/useStories';
import { useAuthStore } from '@/store/auth.store';
import StoryRing from '@/components/stories/StoryRing';
import StoryViewer from '@/components/stories/StoryViewer';
import MyStoryPreview from '@/components/stories/MyStoryPreview';
import Spinner from '@/components/ui/Spinner';
import type { StoryGroup } from '@/types/story.types';

// StoriesPage is the complete stories experience
// Layout:
//   - Horizontal scrolling row of story rings at the top
//     First ring is always "My Story" (own stories or add new)
//     Remaining rings are friends sorted: unviewed first, then viewed
//   - Below the ring row: a list view of the same stories
//     with more detail (last story thumbnail, caption, expiry)
//   - Full-screen StoryViewer overlay when a ring is tapped
//   - StoryPublishModal when posting from CameraPage routes here

const StoriesPage = () => {
  const navigate   = useNavigate();
  const { user }   = useAuthStore();

  const {
    storyGroups,
    isLoadingFeed,
    refetchFeed,
    myStories,
    isLoadingMine,
    deleteStory,
    markViewed,
  } = useStories();

  // which author index to open the viewer at (null = viewer closed)
  const [viewerAuthorIndex, setViewerAuthorIndex] = useState<number | null>(null);

  // whether to show viewer for own stories specifically

  // sort groups: unviewed first, then viewed
  // this mirrors Snapchat's feed order exactly
  const sortedGroups: StoryGroup[] = [
    ...storyGroups.filter(g => !g.allViewed),
    ...storyGroups.filter(g => g.allViewed),
  ];

  // build the "my story group" object for the viewer
  // we only show own stories in the viewer if myStories is non-empty
  const myStoryGroup: StoryGroup | null = myStories.length > 0 && user ? {
    author:    { id: user.id, username: user.username, avatarUrl: user.avatarUrl ?? null },
    stories:   myStories,
    allViewed: true, // own stories always show as "viewed" in the ring
  } : null;

  // combined groups for the viewer: own stories first if they exist
  const viewerGroups: StoryGroup[] = [
    ...(myStoryGroup ? [myStoryGroup] : []),
    ...sortedGroups,
  ];

  const openViewer = (authorIndex: number) => {
    setViewerAuthorIndex(authorIndex);
  };

  const openOwnStories = () => {
    setViewerAuthorIndex(0); // own stories are index 0 in viewerGroups
  };

  const closeViewer = () => {
    setViewerAuthorIndex(null);
    // refetch after viewing to update ring states
    refetchFeed();
  };

  const handleDelete = (storyId: string) => {
    deleteStory(storyId);
    closeViewer();
  };

  const isLoading = isLoadingFeed || isLoadingMine;

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-black tracking-tight">Stories</h1>
          <p className="text-white/30 text-sm mt-0.5">
            {sortedGroups.length > 0
              ? `${sortedGroups.filter(g => !g.allViewed).length} new`
              : 'All caught up'}
          </p>
        </div>
        <button
          onClick={() => refetchFeed()}
          disabled={isLoading}
          className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-40"
          title="Refresh stories"
        >
          <RefreshCw className={cn('w-4 h-4 text-white/50', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* ── Story rings row ──────────────────────────────────────────── */}
      {/* horizontal scroll container */}
      <div className="shrink-0 px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* skeleton rings */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 shrink-0">
                <div className="w-[72px] h-[72px] rounded-full bg-white/[0.06] animate-pulse" />
                <div className="w-12 h-2 rounded bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* my story ring — always first */}
            <div className="shrink-0">
              <MyStoryPreview
                myStories={myStories}
                onAddStory={() => navigate('/camera')}
                onViewStory={openOwnStories}
              />
            </div>

            {/* friend story rings */}
            {sortedGroups.map((group, index) => (
              <div key={group.author.id} className="shrink-0">
                <StoryRing
                  group={group}
                  // +1 offset because own stories are at index 0 in viewerGroups
                  onClick={() => openViewer(myStoryGroup ? index + 1 : index)}
                  size="md"
                  showExpiry
                />
              </div>
            ))}

            {/* empty state when no friends have stories */}
            {sortedGroups.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <BookOpen className="w-5 h-5 text-white/20 shrink-0" />
                <p className="text-white/30 text-sm">
                  No stories from friends yet
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.06] mx-6" />

      {/* ── Stories list (detailed view) ─────────────────────────────── */}
      {/* scrollable list below the rings row                             */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : sortedGroups.length === 0 ? (
          // full empty state when there are zero friend stories
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-white/10" />
            </div>
            <div className="text-center max-w-xs">
              <p className="text-white font-bold text-lg">No stories yet</p>
              <p className="text-white/30 text-sm mt-2 leading-relaxed">
                When your friends post stories, they will appear here.
                Post your own story to get things started.
              </p>
            </div>
            <button
              onClick={() => navigate('/camera')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFFC00] text-black font-bold hover:bg-yellow-300 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              Post a Story
            </button>
          </div>
        ) : (
          // detailed story list
          <div className="flex flex-col gap-2">
            {/* unviewed stories section */}
            {sortedGroups.filter(g => !g.allViewed).length > 0 && (
              <>
                <p className="text-white/30 text-xs font-bold uppercase tracking-wider px-2 mb-1">
                  New
                </p>
                {sortedGroups
                  .filter(g => !g.allViewed)
                  .map((group, index) => (
                    <StoryListItem
                      key={group.author.id}
                      group={group}
                      onClick={() => openViewer(myStoryGroup ? index + 1 : index)}
                    />
                  ))}
              </>
            )}

            {/* viewed stories section */}
            {sortedGroups.filter(g => g.allViewed).length > 0 && (
              <>
                <p className="text-white/30 text-xs font-bold uppercase tracking-wider px-2 mt-4 mb-1">
                  Viewed
                </p>
                {sortedGroups
                  .filter(g => g.allViewed)
                  .map((group, index) => {
                    const unviewedCount = sortedGroups.filter(g => !g.allViewed).length;
                    return (
                      <StoryListItem
                        key={group.author.id}
                        group={group}
                        onClick={() => openViewer(
                          myStoryGroup
                            ? unviewedCount + index + 1
                            : unviewedCount + index
                        )}
                        dimmed
                      />
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Full-screen story viewer overlay ─────────────────────────── */}
      {viewerAuthorIndex !== null && viewerGroups.length > 0 && (
        <StoryViewer
          groups={viewerGroups}
          initialAuthor={viewerAuthorIndex}
          onClose={closeViewer}
          onView={markViewed}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

// ── StoryListItem ────────────────────────────────────────────────────
// Detailed row in the stories list — shows author avatar, name,
// story count, latest story thumbnail, and expiry

interface StoryListItemProps {
  group:   StoryGroup;
  onClick: () => void;
  dimmed?: boolean;
}

const StoryListItem = ({ group, onClick, dimmed }: StoryListItemProps) => {
  const { author, stories, allViewed } = group;
  const latestStory = stories[stories.length - 1];
  const unviewedCount = stories.filter(s => !s.hasViewed).length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl',
        'hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors',
        'border border-transparent hover:border-white/[0.06]',
        dimmed && 'opacity-60'
      )}
    >
      {/* avatar with ring indicator */}
      <div className="relative shrink-0">
        <div className={cn(
          'w-14 h-14 rounded-full overflow-hidden flex items-center justify-center',
          !allViewed
            ? 'ring-2 ring-[#FFFC00] ring-offset-2 ring-offset-black'
            : 'ring-2 ring-white/10'
        )}>
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt={author.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#FFFC00] flex items-center justify-center">
              <span className="text-black font-black text-lg">
                {author.username[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {!allViewed && unviewedCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#FFFC00] border-2 border-black flex items-center justify-center">
            <span className="text-black text-[9px] font-black">{unviewedCount}</span>
          </span>
        )}
      </div>

      {/* text info */}
      <div className="flex-1 min-w-0 text-left">
        <p className={cn(
          'text-sm truncate',
          !allViewed ? 'text-white font-bold' : 'text-white/70 font-medium'
        )}>
          {author.username}
        </p>
        <p className="text-white/30 text-xs mt-0.5 truncate">
          {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          {latestStory.caption ? ` · ${latestStory.caption}` : ''}
        </p>
        <p className={cn(
          'text-xs mt-0.5',
          latestStory.secondsRemaining < 3600 ? 'text-red-400/70' : 'text-white/20'
        )}>
          Expires in {latestStory.secondsRemaining < 3600
            ? `${Math.floor(latestStory.secondsRemaining / 60)}m`
            : `${Math.floor(latestStory.secondsRemaining / 3600)}h`}
        </p>
      </div>

      {/* thumbnail of latest story */}
      {latestStory.mediaUrl && (
        <div className="w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-white/[0.06]">
          <img
            src={latestStory.mediaUrl}
            alt="Story thumbnail"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </button>
  );
};

export default StoriesPage;