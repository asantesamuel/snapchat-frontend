import { cn } from '@/utils/cn';

interface RecordingTimerProps {
  elapsed:    number;   // seconds elapsed
  maxSeconds?: number;  // default 60
  size?:       number;  // SVG size in px, default 80
  isRecording: boolean;
}

const RecordingTimer = ({
  elapsed,
  maxSeconds = 60,
  size = 80,
  isRecording,
}: RecordingTimerProps) => {
  const radius      = (size / 2) - 5;
  const circumference = 2 * Math.PI * radius;
  const progress    = Math.min(elapsed / maxSeconds, 1);
  const dashOffset  = circumference * (1 - progress);

  const remaining   = maxSeconds - elapsed;
  const displaySecs = remaining.toString().padStart(2, '0');
  const isUrgent    = remaining <= 10;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* background ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        {/* progress arc */}
        {isRecording && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isUrgent ? '#ef4444' : '#FFFC00'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        )}
      </svg>

      {/* countdown number */}
      {isRecording && (
        <span className={cn(
          'relative text-sm font-black tabular-nums',
          isUrgent ? 'text-red-400' : 'text-white'
        )}>
          {displaySecs}
        </span>
      )}
    </div>
  );
};

export default RecordingTimer;