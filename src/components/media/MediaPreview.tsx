import { useRef, useEffect } from 'react';
import { RotateCcw, Send, BookOpen, Mic } from 'lucide-react';

export type PreviewType = 'photo' | 'video' | 'audio';

interface MediaPreviewProps {
  type:            PreviewType;
  dataUrl?:        string;
  blobUrl?:        string;
  mimeType:        string;
  onRetake:        () => void;
  onSendSnap:      () => void;
  onPostStory:     () => void;
  isUploading:     boolean;
  uploadProgress:  number;
}

// stable waveform heights computed once — not random each render
const WAVEFORM_HEIGHTS = [
  30, 55, 42, 70, 85, 60, 45, 78, 92, 55,
  40, 68, 80, 50, 38, 72, 88, 62, 47, 75,
  90, 53, 41, 67, 82, 58, 44, 76, 91, 60,
  38, 70,
];

const MediaPreview = ({
  type, dataUrl, blobUrl, mimeType,
  onRetake, onSendSnap, onPostStory,
  isUploading, uploadProgress,
}: MediaPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // auto-play video preview on mount
  useEffect(() => {
    if (videoRef.current && blobUrl && type === 'video') {
      videoRef.current.src = blobUrl;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }
  }, [blobUrl, type]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">

      {/* ── Media display ─────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* PHOTO */}
        {type === 'photo' && dataUrl && (
          <img
            src={dataUrl}
            alt="Snap preview"
            className="w-full h-full object-cover"
          />
        )}

        {/* VIDEO */}
        {type === 'video' && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted={false}
          />
        )}

        {/* AUDIO — visual waveform display */}
        {type === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-zinc-950 to-black">
            <div className="w-24 h-24 rounded-3xl bg-[#FFFC00]/10 border border-[#FFFC00]/20 flex items-center justify-center">
              <Mic className="w-12 h-12 text-[#FFFC00]" />
            </div>

            {/* stable waveform bars — heights from the constant array above */}
            <div className="flex items-end gap-1 h-16 px-4">
              {WAVEFORM_HEIGHTS.map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#FFFC00] rounded-full"
                  style={{
                    height: `${height}%`,
                    animation: `audioBarPulse 1.2s ease-in-out ${i * 0.04}s infinite alternate`,
                    opacity: 0.6 + (height / 100) * 0.4,
                  }}
                />
              ))}
            </div>

            <p className="text-white/60 font-bold text-lg">Audio Note</p>

            {blobUrl && (
              <audio
                controls
                src={blobUrl}
                className="w-64 h-10"
                style={{ filter: 'invert(1) sepia(1) saturate(5) hue-rotate(0deg)' }}
              />
            )}
          </div>
        )}

        {/* ── Upload progress overlay ──────────────────────────────── */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
            {/* spinning ring */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke="rgba(255,252,0,0.15)" strokeWidth="6" />
                <circle cx="40" cy="40" r="34" fill="none"
                  stroke="#FFFC00" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - uploadProgress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[#FFFC00] font-black text-lg">
                {uploadProgress}%
              </span>
            </div>
            <p className="text-white/60 text-sm font-medium">Uploading snap...</p>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFFC00] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <style>{`
          @keyframes audioBarPulse {
            from { transform: scaleY(0.5); }
            to   { transform: scaleY(1); }
          }
        `}</style>
      </div>

      {/* ── Action bar ────────────────────────────────────────────── */}
      {!isUploading && (
        <div className="shrink-0 px-8 py-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent
                        absolute bottom-0 left-0 right-0">
          <div className="flex items-end justify-between max-w-xs mx-auto">

            {/* retake */}
            <button onClick={onRetake} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20
                              flex items-center justify-center
                              group-hover:bg-white/20 group-active:scale-90 transition-all">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/50 text-xs font-medium">Retake</span>
            </button>

            {/* send snap — primary CTA */}
            <button onClick={onSendSnap} className="flex flex-col items-center gap-2 group">
              <div className="w-18 h-18 rounded-full bg-[#FFFC00] flex items-center justify-center
                              group-hover:bg-yellow-300 group-active:scale-90 transition-all
                              shadow-[0_0_32px_rgba(255,252,0,0.5)]"
                   style={{ width: '72px', height: '72px' }}>
                <Send className="w-7 h-7 text-black" />
              </div>
              <span className="text-[#FFFC00] text-xs font-black">Send Snap</span>
            </button>

            {/* post to story */}
            <button onClick={onPostStory} className="flex flex-col items-center gap-2 group">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20
                              flex items-center justify-center
                              group-hover:bg-white/20 group-active:scale-90 transition-all">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/50 text-xs font-medium">Story</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPreview;