import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import ImageUploadModal from './ImageUploadModal';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { MessageType } from '@/types/message.types';
import { cn } from '@/utils/cn';

// MediaUploadWidget is the attach button embedded in MessageInput
// Clicking it opens the native file picker (images only)
// After the user selects an image, ImageUploadModal opens for preview
// On confirm, useMediaUpload runs the presign→S3→confirm flow
// On success, onSent is called with the fileUrl and mediaId
// so MessageInput's parent (ConversationPage) can emit the socket event

interface MediaUploadWidgetProps {
  // called when upload completes successfully
  // parent must emit the socket message using these values
  onSent: (
    fileUrl:     string,
    mediaId:     string,
    messageType: MessageType,
    isEphemeral: boolean
  ) => void;
  disabled?: boolean;
}

const MediaUploadWidget = ({ onSent, disabled }: MediaUploadWidgetProps) => {
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { upload, isUploading, progress, reset } = useMediaUpload();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    // reset the input so selecting the same file again triggers onChange
    e.target.value = '';
  };

  const handleConfirm = async (file: File, isEphemeral: boolean) => {
    const result = await upload(file, file.type);
    if (!result) return; // upload failed — useMediaUpload shows toast

    onSent(result.fileUrl, result.mediaId, MessageType.IMAGE, isEphemeral);
    setSelectedFile(null);
    reset();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    reset();
  };

  return (
    <>
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        title="Select image to upload"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* attach button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Attach image"
        className={cn(
          'mb-1 p-1.5 rounded-full transition-all shrink-0',
          'text-white/20 hover:text-white/50',
          'disabled:opacity-30 disabled:cursor-not-allowed'
        )}
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* preview + confirm modal */}
      {selectedFile && (
        <ImageUploadModal
          file={selectedFile}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isUploading={isUploading}
          uploadProgress={progress}
        />
      )}
    </>
  );
};

export default MediaUploadWidget;