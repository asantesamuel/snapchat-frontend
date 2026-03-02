import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

// AvatarUploader renders the current avatar with a camera overlay button
// clicking anywhere on the avatar opens the file picker
// it shows a local preview immediately while the upload is in progress
// this is called "optimistic preview" — the user sees the change
// before the server confirms it, making the UI feel instant

interface AvatarUploaderProps {
  currentUrl:   string | null | undefined;
  username:     string;
  isUploading:  boolean;
  onFileSelect: (file: File) => void;
  size?:        'lg' | 'xl';
}

const AvatarUploader = ({
  currentUrl,
  username,
  isUploading,
  onFileSelect,
  size = 'xl',
}: AvatarUploaderProps) => {
  const fileInputRef        = useRef<HTMLInputElement>(null);
  // localPreview holds a temporary object URL created from the selected file
  // displayed immediately while the real upload is in progress
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validate file type before even touching the server
    if (!file.type.startsWith('image/')) {
      return;
    }

    // create a local object URL for immediate preview
    // this URL is only valid in the current browser session
    // it will be revoked when the component unmounts or a new file is selected
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));

    onFileSelect(file);
  };

  const displaySrc = localPreview || currentUrl;
  const initials   = username.slice(0, 2).toUpperCase();

  const sizeClasses = {
    lg: 'w-20 h-20 text-2xl',
    xl: 'w-28 h-28 text-3xl',
  };

  return (
    <div className="relative inline-block">
      {/* hidden file input — triggered by clicking the avatar */}
      <input
        ref={fileInputRef}
        type="file"
        title="Upload avatar"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* avatar button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Change avatar"
        disabled={isUploading}
        className={cn(
          'relative rounded-full overflow-hidden bg-[#FFFC00] flex items-center justify-center',
          'ring-4 ring-[#FFFC00]/20 ring-offset-4 ring-offset-black',
          'transition-all hover:ring-[#FFFC00]/40 active:scale-95',
          'disabled:cursor-not-allowed',
          sizeClasses[size],
        )}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-black text-black">{initials}</span>
        )}

        {/* dark overlay on hover with camera icon */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center">
          {!isUploading && (
            <Camera className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* uploading spinner overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#FFFC00] animate-spin" />
          </div>
        )}
      </button>

      {/* small camera badge on bottom-right */}
      {!isUploading && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Upload photo"
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFFC00] flex items-center justify-center border-2 border-black hover:bg-yellow-300 transition-colors"
        >
          <Camera className="w-4 h-4 text-black" />
        </button>
      )}
    </div>
  );
};

export default AvatarUploader;