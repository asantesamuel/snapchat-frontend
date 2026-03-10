import { useState, useEffect, useMemo } from 'react';
import { X, Send, Flame, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

// ImageUploadModal is shown after a user selects an image from their gallery
// It gives them a chance to:
//   - Review the full image before sending
//   - Toggle ephemeral (snap) mode
//   - Cancel and pick a different image
//
// It does NOT upload anything itself — it calls onConfirm with the
// File object and ephemeral flag, and the parent handles the upload.
// This keeps concerns separated: UI preview vs upload logic.

interface ImageUploadModalProps {
  file:         File;
  onConfirm:    (file: File, isEphemeral: boolean) => void;
  onCancel:     () => void;
  isUploading:  boolean;
  uploadProgress: number;
}

// maximum file size: 10MB (backend enforces this too, but we check early
// to give the user immediate feedback without a server round-trip)
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ImageUploadModal = ({
  file, onConfirm, onCancel, isUploading, uploadProgress,
}: ImageUploadModalProps) => {
  const [isEphemeral, setIsEphemeral] = useState(false);

  const sizeError = file.size > MAX_FILE_SIZE_BYTES;

  // Use useMemo to create the object URL synchronously during render.
  // This avoids the "cascading render" warning from calling setState in useEffect.
  const previewUrl = useMemo(() => {
    if (sizeError) return null;
    const url = URL.createObjectURL(file);
    // Note: We still need to revoke this, but useMemo doesn't have a cleanup.
    return url;
  }, [file, sizeError]);

  // Handle cleanup of the object URL when the component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // format bytes as human-readable string for the size error message
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 shrink-0">
        <button
        title='cancel'
          onClick={onCancel}
          disabled={isUploading}
          className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center hover:bg-white/15 transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <p className="text-white font-bold text-sm">Send Image</p>

        {/* ephemeral toggle in header */}
        <button
          onClick={() => setIsEphemeral(v => !v)}
          disabled={isUploading}
          title={isEphemeral ? 'Snap mode ON' : 'Enable snap mode'}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-40',
            isEphemeral
              ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
              : 'bg-white/[0.08] text-white/40 hover:text-white/70'
          )}
        >
          <Flame className="w-5 h-5" />
        </button>
      </div>

      {/* ── Image preview ───────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">

        {sizeError ? (
          // size error state
          <div className="flex flex-col items-center gap-4 text-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">File Too Large</p>
              <p className="text-white/40 text-sm mt-1">
                This image is {fileSizeMB}MB. Maximum size is {MAX_FILE_SIZE_MB}MB.
              </p>
            </div>
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-full bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              Choose Different Image
            </button>
          </div>
        ) : previewUrl ? (
          // image preview
          <div className="relative max-w-sm w-full">
            <img
              src={previewUrl}
              alt="Preview"
              className={cn(
                'w-full rounded-3xl object-contain shadow-2xl',
                isEphemeral && 'ring-2 ring-red-500/40'
              )}
              style={{ maxHeight: '65vh' }}
            />

            {/* ephemeral indicator overlay */}
            {isEphemeral && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Flame className="w-4 h-4 text-red-400" />
                <span className="text-white text-xs font-bold">Snap Mode</span>
              </div>
            )}

            {/* file info */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-white/50 shrink-0" />
                <span className="text-white/70 text-xs truncate">{file.name}</span>
              </div>
              <span className="text-white/40 text-xs shrink-0 ml-2">{fileSizeMB}MB</span>
            </div>

            {/* upload progress overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke="rgba(255,252,0,0.15)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="26" fill="none"
                      stroke="#FFFC00" strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - uploadProgress / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[#FFFC00] font-black text-sm">
                    {uploadProgress}%
                  </span>
                </div>
                <p className="text-white/60 text-xs">Uploading...</p>
              </div>
            )}
          </div>
        ) : (
          // loading state while object URL is being created
          <div className="w-10 h-10 rounded-full border-2 border-[#FFFC00]/20 border-t-[#FFFC00] animate-spin" />
        )}
      </div>

      {/* ── Ephemeral notice ─────────────────────────────────────────── */}
      {isEphemeral && (
        <div className="px-6 py-2 shrink-0">
          <p className="text-center text-red-400/70 text-xs flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            This image will disappear after the recipient views it
          </p>
        </div>
      )}

      {/* ── Send button ──────────────────────────────────────────────── */}
      {!sizeError && (
        <div className="px-6 pb-10 pt-4 shrink-0">
          <button
            onClick={() => onConfirm(file, isEphemeral)}
            disabled={isUploading || !previewUrl}
            className={cn(
              'w-full flex items-center justify-center gap-3 py-4 rounded-2xl',
              'font-bold text-base transition-all',
              isUploading || !previewUrl
                ? 'bg-white/[0.06] text-white/20 cursor-not-allowed'
                : 'bg-[#FFFC00] text-black hover:bg-yellow-300 active:scale-[0.98] shadow-[0_0_24px_rgba(255,252,0,0.3)]'
            )}
          >
            <Send className="w-5 h-5" />
            {isUploading
              ? `Uploading... ${uploadProgress}%`
              : isEphemeral
                ? 'Send as Snap 🔥'
                : 'Send Image'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadModal;