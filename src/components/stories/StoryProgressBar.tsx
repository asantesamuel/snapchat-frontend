// StoryProgressBar renders the multi-segment bar at the top of the viewer
// Each segment represents one story in the current author's group
// Completed segments are 100% white
// The active segment fills from 0% to 100% over the story's duration
// Upcoming segments are empty (0% fill, just the track)

interface StoryProgressBarProps {
  totalSegments: number;    // how many stories this author has
  activeIndex:   number;    // which story is currently playing (0-based)
  progress:      number;    // 0.0 to 1.0 — fill for the active segment
}

const StoryProgressBar = ({
  totalSegments,
  activeIndex,
  progress,
}: StoryProgressBarProps) => {
  return (
    <div className="flex items-center gap-1 w-full px-3 pt-3">
      {Array.from({ length: totalSegments }).map((_, i) => {
        // determine the fill width for this segment
        const fillPercent =
          i < activeIndex  ? 100          :   // completed → full
          i === activeIndex ? progress * 100 : // active → animated
          0;                                   // upcoming → empty

        return (
          <div
            key={i}
            className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full"
              style={{
                width:      `${fillPercent}%`,
                // only animate the active segment
                // completed and upcoming segments should snap instantly
                transition: i === activeIndex ? 'width 0.1s linear' : 'none',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StoryProgressBar;