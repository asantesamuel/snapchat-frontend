import { useRef, useState } from 'react';
import { X, RefreshCw, Mic, MicOff, ZapOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCamera } from '@/hooks/useCamera';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import RecordingTimer from './RecordingTimer';

interface SnapCameraProps {
  onPhoto:   (dataUrl: string, mimeType: string) => void;
  onVideo:   (blob: Blob, url: string, mimeType: string, duration: number) => void;
  onAudio:   (blob: Blob, url: string, mimeType: string, duration: number) => void;
  onClose:   () => void;
}

const SnapCamera = ({ onPhoto, onVideo, onAudio, onClose }: SnapCameraProps) => {
  const {
    videoRef, stream, facingMode,
    hasPermission, permissionError, isReady,
    flipCamera, stopCamera, takePhoto,
  } = useCamera();

  const {
    recordingState, recordingMode, elapsedSeconds,
    startRecording, stopRecording, recordedBlob, recordedUrl, resetRecording,
  } = useMediaRecorder();

  const [captureMode, setCaptureMode] = useState<'photo' | 'video' | 'audio'>('photo');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress    = useRef(false);

  const isRecording = recordingState === 'recording';

  // ── Capture button interactions ──────────────────────────────────
  // short press = take photo, long press = record video
  const handlePointerDown = () => {
    if (captureMode === 'audio') return; // audio uses its own button
    isLongPress.current = false;

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      if (stream && captureMode === 'video') {
        startRecording(stream, 'video');
      }
    }, 400); // 400ms threshold for long press
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (isRecording) {
      // releasing during recording stops it
      stopRecording();
      return;
    }

    if (!isLongPress.current && captureMode !== 'audio') {
      // short press — take photo
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

  // when recording finishes and we have a blob, bubble it up
  const handleRecordingComplete = () => {
    if (!recordedBlob || !recordedUrl) return;

    // extract the actual mime type from the blob
    const mimeType = recordedBlob.type || 'video/webm';

    if (recordingMode === 'video') {
      stopCamera();
      onVideo(recordedBlob, recordedUrl, mimeType, elapsedSeconds);
    } else {
      stopCamera();
      onAudio(recordedBlob, recordedUrl, mimeType, elapsedSeconds);
    }
    resetRecording();
  };

  // auto-complete when recording stops
  if (recordingState === 'stopped' && recordedBlob) {
    handleRecordingComplete();
  }

  // ── Permission denied screen ─────────────────────────────────────
  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-3xl bg-white/[0.04] flex items-center justify-center">
          <ZapOff className="w-10 h-10 text-white/30" />
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg mb-2">Camera Access Required</p>
          <p className="text-white/40 text-sm leading-relaxed">{permissionError}</p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">

      {/* ── Viewfinder ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            facingMode === 'user' && 'scale-x-[-1]', // mirror front camera
          )}
        />

        {/* loading overlay */}
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-10 h-10 rounded-full border-2 border-[#FFFC00]/20 border-t-[#FFFC00] animate-spin" />
          </div>
        )}

        {/* recording pulse border */}
        {isRecording && (
          <div className="absolute inset-0 border-4 border-red-500 pointer-events-none animate-pulse rounded-none" />
        )}

        {/* recording mode badge */}
        {isRecording && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              {recordingMode === 'audio' ? 'Recording Audio' : 'Recording'}
            </span>
          </div>
        )}

        {/* top controls */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            title="Close camera"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={flipCamera}
            disabled={isRecording}
            title="Flip camera"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors disabled:opacity-30"
          >
            <RefreshCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* ── Bottom Controls ────────────────────────────────────────── */}
      <div className="shrink-0 pb-10 pt-6 px-8 bg-gradient-to-t from-black/90 to-transparent absolute bottom-0 left-0 right-0">

        {/* mode selector */}
        {!isRecording && (
          <div className="flex justify-center gap-6 mb-6">
            {(['photo', 'video', 'audio'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setCaptureMode(mode)}
                className={cn(
                  'text-xs font-bold uppercase tracking-widest transition-all',
                  captureMode === mode
                    ? 'text-[#FFFC00] scale-110'
                    : 'text-white/40 hover:text-white/70'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        {/* main capture area */}
        <div className="flex items-center justify-center relative">

          {/* audio record button */}
          {captureMode === 'audio' && (
            <button
              onClick={handleAudioToggle}
              title={isRecording ? "Stop recording audio" : "Start recording audio"}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90',
                isRecording
                  ? 'bg-red-500 shadow-[0_0_32px_rgba(239,68,68,0.6)]'
                  : 'bg-white/10 border-2 border-white/30 hover:bg-white/20'
              )}
            >
              {isRecording
                ? <MicOff className="w-8 h-8 text-white" />
                : <Mic className="w-8 h-8 text-white" />}
            </button>
          )}

          {/* photo/video capture button with recording timer ring */}
          {captureMode !== 'audio' && (
            <div className="relative">
              <RecordingTimer
                elapsed={elapsedSeconds}
                isRecording={isRecording}
                size={88}
              />
              <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                title={isRecording ? "Stop recording" : (captureMode === 'video' ? "Take photo or hold for video" : "Take photo")}
                className={cn(
                  'absolute inset-0 m-auto w-16 h-16 rounded-full',
                  'flex items-center justify-center transition-all',
                  'focus:outline-none',
                  isRecording
                    ? 'bg-red-500 scale-90 shadow-[0_0_24px_rgba(239,68,68,0.5)]'
                    : 'bg-white active:scale-90 hover:bg-white/90'
                )}
                style={{ width: 64, height: 64, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                {isRecording && (
                  <div className="w-6 h-6 rounded-sm bg-white" />
                )}
              </button>
            </div>
          )}

          {/* hint text */}
          {captureMode === 'video' && !isRecording && (
            <p className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-white/30 text-xs whitespace-nowrap">
              Tap for photo · Hold for video
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SnapCamera;