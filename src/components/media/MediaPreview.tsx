import { useRef, useEffect } from 'react';
import { RotateCcw, Send, BookOpen } from 'lucide-react';
import { cn } from '@/utils/cn';

export type PreviewType = 'photo' | 'video' | 'audio';

interface MediaPreviewProps {
  type:       PreviewType;
  dataUrl?:   string;   // for photo (base64)
  blobUrl?:   string;   // for video/audio (object URL)
  mimeType:   string;
  onRetake:   () => void;
  onSendSnap: () => void;
  onPostStory: () => void;
  isUploading: boolean;
  uploadProgress: number;
}

const MediaPreview = ({
  type,
  dataUrl,
  blobUrl,
  mimeType,
  onRetake,
  onSendSnap,
  onPostStory,
  isUploading,
  uploadProgress,
}: MediaPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && blobUrl && type === 'video') {
      videoRef.current.src = blobUrl;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }
  }, [blobUrl, type]);

  const src = type === 'photo' ? dataUrl : blobUrl;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* media display area */}
      <div className="flex-1 relative overflow-hidden">
        {type === 'photo' && src && (
          <img
            src={src}
            alt="Snap preview"
            className="w-full h-full object-cover"
          />
        )}

        {type === 'video' && (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted={false}
          />
        )}

        {type === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-zinc-900 to-black">
            {/* audio waveform visual */}
            <div className="flex items-end gap-1 h-20">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#FFFC00] rounded-full opacity-80"
                  style={{
                    // eslint-disable-next-line react-hooks/purity
                    height: `${20 + Math.sin(i * 0.8) * 40 + Math.random() * 20}%`,
                    animation: `audioBar 1s ease-in-out ${i * 0.05}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <p className="text-white font-bold text-lg">Audio Note</p>
            {blobUrl && (
              <audio controls src={blobUrl} className="w-64 opacity-60" />
            )}
            <style>{`
              @keyframes audioBar {
                from { transform: scaleY(0.4); opacity: 0.5; }
                to   { transform: scaleY(1);   opacity: 1;   }
              }
            `}</style>
          </div>
        )}

        {/* upload progress overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-[#FFFC00]/20 border-t-[#FFFC00] animate-spin" />
            <div className="flex flex-col items-center gap-2">
              <span className="text-white font-bold text-lg">{uploadProgress}%</span>
              <span className="text-white/50 text-sm">Uploading snap...</span>
            </div>
            {/* progress bar */}
            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFFC00] rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* controls bar */}
      {!isUploading && (
        <div className="shrink-0 px-6 py-8 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 right-0">
          <div className="flex items-center justify-between gap-4">
            {/* retake */}
            <button
              onClick={onRetake}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all group-active:scale-90">
                <RotateCcw className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Retake</span>
            </button>

            {/* post to story */}
            <button
              onClick={onPostStory}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-all group-active:scale-90">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/60 text-xs">Story</span>
            </button>

            {/* send snap */}
            <button
              onClick={onSendSnap}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className="w-16 h-16 rounded-full bg-[#FFFC00] flex items-center justify-center group-hover:bg-yellow-300 transition-all group-active:scale-90 shadow-[0_0_24px_rgba(255,252,0,0.4)]">
                <Send className="w-7 h-7 text-black" />
              </div>
              <span className="text-[#FFFC00] text-xs font-bold">Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPreview;