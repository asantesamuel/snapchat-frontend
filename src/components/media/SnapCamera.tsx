import { useRef, useState } from 'react';
import { X, RefreshCw, Mic, MicOff, ZapOff, Image } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCamera } from '@/hooks/useCamera';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import RecordingTimer from './RecordingTimer';

interface SnapCameraProps {
  onPhoto:       (dataUrl: string, mimeType: string) => void;
  onVideo:       (blob: Blob, url: string, mimeType: string, duration: number) => void;
  onAudio:       (blob: Blob, url: string, mimeType: string, duration: number) => void;
  onGallery:     () => void;   // opens the file picker
  onClose:       () => void;
}

type CaptureMode = 'photo' | 'video' | 'audio';

const SnapCamera = ({
  onPhoto, onVideo, onAudio, onGallery, onClose
}: SnapCameraProps) => {
  const {
    videoRef, stream, facingMode,
    hasPermission, permissionError, isReady,
    flipCamera, stopCamera, takePhoto,
  } = useCamera();

  const {
    recordingState, recordingMode, elapsedSeconds,
    startRecording, stopRecording, recordedBlob, recordedUrl, resetRecording,
  } = useMediaRecorder();

  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress    = useRef(false);

  const isRecording = recordingState === 'recording';

  // ── Auto-complete when recording finishes ────────────────────────
  // useEffect cannot be used here due to the hook call order constraint,
  // so we handle the stopped state inline during render
  if (recordingState === 'stopped' && recordedBlob && recordedUrl) {
    const mimeType = recordedBlob.type || 'video/webm';
    // schedule the callback to run after this render cycle completes
    setTimeout(() => {
      if (recordingMode === 'video') {
        stopCamera();
        onVideo(recordedBlob, recordedUrl, mimeType, elapsedSeconds);
      } else {
        stopCamera();
        onAudio(recordedBlob, recordedUrl, mimeType, elapsedSeconds);
      }
      resetRecording();
    }, 0);
  }

  // ── Long press detection for video recording ─────────────────────
  // pointerdown starts a 400ms timer — if not cancelled it's a long press
  // pointerup cancels the timer: if it was short it takes a photo
  // if already recording, pointerup stops the recording
  const handlePointerDown = () => {
    if (captureMode === 'audio') return;
    isLongPress.current = false;

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (stream && captureMode === 'video') {
        startRecording(stream, 'video');
      }
    }, 400);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (isRecording) {
      stopRecording();
      return;
    }

    if (!isLongPress.current && captureMode !== 'audio') {
      const dataUrl = takePhoto();
      if (dataUrl) {
        stopCamera();
        onPhoto(dataUrl, 'image/jpeg');
      }
    }
  };

  const handleAudioToggle = () => {
    if (isRecording) {
      stopRecording();
    } else if (stream) {
      startRecording(stream, 'audio');
    }
  };

  // ── Permission denied ────────────────────────────────────────────
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          <ZapOff className="w-10 h-10 text-white/20" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-white font-bold text-lg mb-2">Camera Access Required</p>
          <p className="text-white/40 text-sm leading-relaxed">{permissionError}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onGallery}
            className="px-5 py-3 rounded-full bg-[#FFFC00] text-black font-bold text-sm hover:bg-yellow-300 transition-colors"
          >
            Upload from Gallery
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none overflow-hidden">

      {/* ── Viewfinder ───────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            facingMode === 'user' && 'scale-x-[-1]',
          )}
        />

        {/* loading state */}
        {!isReady && (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-[#FFFC00]/20 border-t-[#FFFC00] animate-spin" />
          </div>
        )}

        {/* red recording border pulse */}
        {isRecording && (
          <div className="absolute inset-0 border-4 border-red-500/80 pointer-events-none">
            <div className="absolute inset-0 border-4 border-red-500/40 animate-pulse" />
          </div>
        )}

        {/* recording badge */}
        {isRecording && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">
              {recordingMode === 'audio' ? 'Recording Audio' : 'Recording'}
            </span>
          </div>
        )}

        {/* top controls */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
          <button
            title="Close"
            onClick={() => { stopCamera(); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3">
            {/* gallery shortcut */}
            <button
              onClick={onGallery}
              disabled={isRecording}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              title="Upload from gallery"
            >
              <Image className="w-5 h-5 text-white" />
            </button>

            {/* flip camera */}
            <button
              onClick={flipCamera}
              disabled={isRecording}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-all disabled:opacity-30"
              title="Flip camera"
            >
              <RefreshCw className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <div className="shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent pb-12 pt-8 px-8">

        {/* mode selector */}
        {!isRecording && (
          <div className="flex justify-center gap-8 mb-8">
            {(['photo', 'video', 'audio'] as CaptureMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setCaptureMode(mode)}
                className={cn(
                  'text-xs font-bold uppercase tracking-widest transition-all duration-200',
                  captureMode === mode
                    ? 'text-[#FFFC00] scale-105'
                    : 'text-white/30 hover:text-white/60'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        {/* capture controls */}
        <div className="flex items-center justify-center">

          {/* AUDIO mode — dedicated mic button */}
          {captureMode === 'audio' && (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={handleAudioToggle}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90',
                  isRecording
                    ? 'bg-red-500 shadow-[0_0_32px_rgba(239,68,68,0.6)]'
                    : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
                )}
              >
                {isRecording
                  ? <MicOff className="w-8 h-8 text-white" />
                  : <Mic    className="w-8 h-8 text-white" />}
              </button>
              {isRecording && (
                <p className="text-white/50 text-xs">
                  {elapsedSeconds}s / 60s — tap to stop
                </p>
              )}
            </div>
          )}

          {/* PHOTO / VIDEO mode — single button with recording ring */}
          {captureMode !== 'audio' && (
            <div className="flex flex-col items-center gap-2">
              {/* the recording timer ring wraps the capture button */}
              {/* both sit in a relative container for clean alignment */}
              <div className="relative flex items-center justify-center w-24 h-24">
                {/* SVG progress ring */}
                <RecordingTimer
                  elapsed={elapsedSeconds}
                  isRecording={isRecording}
                  size={88}
                />
                {/* capture button — centred inside the ring using flexbox */}
                <button
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className={cn(
                    'absolute w-16 h-16 rounded-full',
                    'flex items-center justify-center',
                    'transition-all duration-150 focus:outline-none',
                    isRecording
                      ? 'bg-red-500 scale-90 shadow-[0_0_24px_rgba(239,68,68,0.5)]'
                      : captureMode === 'photo'
                        ? 'bg-white hover:bg-white/90 active:scale-90'
                        : 'bg-white border-4 border-red-500 hover:bg-white/90 active:scale-90'
                  )}
                >
                  {/* stop icon shown while recording */}
                  {isRecording && (
                    <div className="w-5 h-5 rounded-sm bg-white" />
                  )}
                </button>
              </div>

              {/* mode hint */}
              {!isRecording && (
                <p className="text-white/25 text-xs mt-1">
                  {captureMode === 'photo'
                    ? 'Tap to capture'
                    : 'Hold to record · release to stop'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnapCamera;