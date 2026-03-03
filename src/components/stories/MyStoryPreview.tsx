import { Plus, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import type { Story } from '@/types/story.types';

// MyStoryPreview is the first ring in the stories row
// It shows the current user's avatar with:
//   - A "+" button overlay if they have NO active stories
//   - Their latest story thumbnail if they DO have active stories
// Clicking it when there are stories opens the viewer on their stories
// Clicking it when there are no stories opens the camera

interface MyStoryPreviewProps {
  myStories:    Story[];
  onAddStory:   () => void;   // navigate to camera
  onViewStory:  () => void;   // open viewer on own stories
}

const MyStoryPreview = ({
  myStories,
  onAddStory,
  onViewStory,
}: MyStoryPreviewProps) => {
  const { user }     = useAuthStore();
  const hasStories   = myStories.length > 0;
  const totalViews   = myStories.reduce((sum, s) => sum + s.viewCount, 0);
  const initials     = user?.username?.slice(0, 2).toUpperCase() || '??';

  const handleClick  = () => {
    if (hasStories) onViewStory();
    else onAddStory();
  };

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-2 group"
    >
      <div className="relative">
        {/* avatar */}
        <div className="w-[72px] h-[72px] rounded-full overflow-hidden bg-[#FFFC00] flex items-center justify-center ring-2 ring-white/10 group-active:scale-95 transition-transform">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-black text-black text-xl">{initials}</span>
          )}
        </div>

        {/* add story badge — bottom right */}
        <div className={`
          absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-black
          flex items-center justify-center transition-colors
          ${hasStories ? 'bg-[#FFFC00]' : 'bg-[#FFFC00]'}
        `}>
          <Plus className="w-3.5 h-3.5 text-black" />
        </div>
      </div>

      {/* label */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-white text-xs font-semibold">My Story</span>
        {hasStories && (
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-white/30" />
            <span className="text-white/30 text-[10px]">{totalViews}</span>
          </div>
        )}
      </div>
    </button>
  );
};

export default MyStoryPreview;