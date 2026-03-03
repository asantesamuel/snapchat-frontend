import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Globe, Lock, Check,
  Search, Loader2, BookOpen
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { StoryVisibility, StoryType } from '@/types/story.types';
import { friendshipsApi } from '@/api/friendships.api';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useStories } from '@/hooks/useStories';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

// StoryPublishModal is shown after the user captures a photo/video
// and taps "Post to Story" in MediaPreview.
// It handles:
//   1. Visibility selection: PUBLIC (all friends) or CUSTOM (specific friends)
//   2. Friend selector — only shown when CUSTOM is chosen
//   3. Caption input
//   4. The upload flow: compress → presign → S3 PUT → confirm → publish story

interface StoryPublishModalProps {
  mediaBlob:  Blob;              // the captured media
  mediaType:  'image' | 'video'; // determines StoryType enum value
  mimeType:   string;
  duration?:  number;            // video duration in seconds
  onClose:    () => void;
  onSuccess:  () => void;
}

const StoryPublishModal = ({
  mediaBlob,
  mediaType,
  mimeType,
  duration,
  onClose,
  onSuccess,
}: StoryPublishModalProps) => {
  const [visibility, setVisibility]           = useState<StoryVisibility>(StoryVisibility.PUBLIC);
  const [caption, setCaption]                 = useState('');
  const [search, setSearch]                   = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const { upload, isUploading, progress }     = useMediaUpload();
  const { publishStory, isPublishing }        = useStories();

  // fetch friends for the custom audience selector
  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn:  () => friendshipsApi.list(),
  });

  const friends = friendsData?.friendships || [];
  const filtered = friends.filter(f =>
    f.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFriend = (username: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const handlePublish = async () => {
    // Step 1: upload the media file to S3
    const result = await upload(mediaBlob, mimeType, duration);
    if (!result) return; // upload failed, error already toasted by useMediaUpload

    // Step 2: publish the story with the returned media URL
    publishStory(
      {
        mediaUrl:   result.fileUrl,
        s3Key:      result.s3Key,
        storyType:  mediaType === 'image' ? StoryType.IMAGE : StoryType.VIDEO,
        visibility,
        caption:    caption.trim() || undefined,
        duration,
        allowedViewerUsernames:
          visibility === StoryVisibility.CUSTOM
            ? Array.from(selectedFriends)
            : undefined,
      },
      { onSuccess }
    );
  };

  const isLoading = isUploading || isPublishing;

  // disable publish if custom visibility but no friends selected
  const canPublish =
    visibility === StoryVisibility.PUBLIC ||
    (visibility === StoryVisibility.CUSTOM && selectedFriends.size > 0);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
        <button
          title="Close"
          onClick={onClose}
          disabled={isLoading}
          className="text-white/50 hover:text-white transition-colors disabled:opacity-30"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#FFFC00]" />
          <h2 className="text-white font-black text-lg">Post Story</h2>
        </div>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-5">

        {/* ── Caption ─────────────────────────────────────────────── */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-2">
            Caption (optional)
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption..."
            maxLength={150}
            rows={2}
            className="w-full bg-white/[0.06] border border-white/[0.06] rounded-2xl px-4 py-3 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#FFFC00]/40 resize-none transition-colors"
          />
          <p className="text-white/20 text-xs text-right mt-1">{caption.length}/150</p>
        </div>

        {/* ── Visibility selector ──────────────────────────────────── */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-2">
            Who can see this?
          </label>

          <div className="flex flex-col gap-2">
            {/* PUBLIC option */}
            <button
              onClick={() => setVisibility(StoryVisibility.PUBLIC)}
              className={cn(
                'flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all',
                visibility === StoryVisibility.PUBLIC
                  ? 'bg-[#FFFC00]/10 border-[#FFFC00]/40'
                  : 'bg-white/[0.04] border-white/[0.06] hover:border-white/20'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                visibility === StoryVisibility.PUBLIC
                  ? 'bg-[#FFFC00]/20'
                  : 'bg-white/[0.06]'
              )}>
                <Globe className={cn(
                  'w-5 h-5',
                  visibility === StoryVisibility.PUBLIC ? 'text-[#FFFC00]' : 'text-white/40'
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  'font-bold text-sm',
                  visibility === StoryVisibility.PUBLIC ? 'text-[#FFFC00]' : 'text-white/70'
                )}>
                  All Friends
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  Everyone in your friends list can see this story
                </p>
              </div>
              {visibility === StoryVisibility.PUBLIC && (
                <Check className="w-4 h-4 text-[#FFFC00] shrink-0" />
              )}
            </button>

            {/* CUSTOM option */}
            <button
              onClick={() => setVisibility(StoryVisibility.CUSTOM)}
              className={cn(
                'flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all',
                visibility === StoryVisibility.CUSTOM
                  ? 'bg-[#FFFC00]/10 border-[#FFFC00]/40'
                  : 'bg-white/[0.04] border-white/[0.06] hover:border-white/20'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                visibility === StoryVisibility.CUSTOM
                  ? 'bg-[#FFFC00]/20'
                  : 'bg-white/[0.06]'
              )}>
                <Lock className={cn(
                  'w-5 h-5',
                  visibility === StoryVisibility.CUSTOM ? 'text-[#FFFC00]' : 'text-white/40'
                )} />
              </div>
              <div className="flex-1 text-left">
                <p className={cn(
                  'font-bold text-sm',
                  visibility === StoryVisibility.CUSTOM ? 'text-[#FFFC00]' : 'text-white/70'
                )}>
                  Custom Audience
                </p>
                <p className="text-white/30 text-xs mt-0.5">
                  Choose specific friends who can view this story
                </p>
              </div>
              {visibility === StoryVisibility.CUSTOM && (
                <Check className="w-4 h-4 text-[#FFFC00] shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* ── Friend selector (CUSTOM only) ───────────────────────── */}
        {visibility === StoryVisibility.CUSTOM && (
          <div>
            <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-2">
              Select Friends ({selectedFriends.size} selected)
            </label>

            {/* search */}
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="w-full bg-white/[0.06] border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#FFFC00]/40 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-6">
                  {friends.length === 0 ? 'Add friends first' : 'No friends found'}
                </p>
              ) : (
                filtered.map(f => {
                  const isSelected = selectedFriends.has(f.user.username);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFriend(f.user.username)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                    >
                      <Avatar src={f.user.avatarUrl} username={f.user.username} size="sm" />
                      <span className="text-white text-sm flex-1 text-left">
                        {f.user.username}
                      </span>
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                        isSelected ? 'bg-[#FFFC00] border-[#FFFC00]' : 'border-white/20'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Upload progress ──────────────────────────────────────── */}
        {isUploading && (
          <div className="bg-white/[0.04] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Uploading media...</span>
              <span className="text-[#FFFC00] font-bold text-sm">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFFC00] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Post button ─────────────────────────────────────────────── */}
      <div className="px-5 py-6 border-t border-white/[0.06] shrink-0">
        <Button
          size="lg"
          disabled={!canPublish || isLoading}
          loading={isLoading}
          onClick={handlePublish}
        >
          {isPublishing ? 'Publishing...' : isUploading ? 'Uploading...' : 'Post Story'}
        </Button>
        {visibility === StoryVisibility.CUSTOM && selectedFriends.size === 0 && !isLoading && (
          <p className="text-white/25 text-xs text-center mt-2">
            Select at least one friend to post a custom story
          </p>
        )}
      </div>
    </div>
  );
};

export default StoryPublishModal;