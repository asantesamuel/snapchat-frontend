import { useState, useCallback } from "react";
import { mediaApi } from "@/api/media.api";
import { MediaType } from "@/types/media.types";
import toast from "react-hot-toast";

export interface UploadResult {
  mediaId: string;
  fileUrl: string;
  s3Key: string;
}

export interface UseMediaUploadReturn {
  upload: (
    file: Blob,
    mimeType: string,
    duration?: number,
  ) => Promise<UploadResult | null>;
  isUploading: boolean;
  progress: number; // 0–100
  error: string | null;
  reset: () => void;
}

// converts a blob's MIME type to our MediaType enum
const getMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith("image/")) return MediaType.IMAGE;
  if (mimeType.startsWith("video/")) return MediaType.VIDEO;
  if (mimeType.startsWith("audio/")) return MediaType.AUDIO;
  throw new Error(`Unsupported media type: ${mimeType}`);
};

// extracts a clean MIME type without codec parameters
// 'video/webm;codecs=vp9,opus' → 'video/webm'
const cleanMimeType = (mimeType: string): string =>
  mimeType.split(";")[0].trim();

export const useMediaUpload = (): UseMediaUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(
    async (
      file: Blob,
      mimeType: string,
      duration?: number,
    ): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const cleanType = cleanMimeType(mimeType);
        const mediaType = getMediaType(cleanType);

        // ── Step 1: Request presigned upload URL from backend ──────────
        setProgress(10);
        const { mediaId, uploadUrl, fileUrl, s3Key } =
          await mediaApi.requestUpload({
            mediaType,
            mimeType: cleanType,
            fileSize: file.size,
            duration,
          });

        // ── Step 2: PUT file directly to S3 ───────────────────────────
        // this bypasses our backend entirely — goes straight to AWS
        setProgress(30);
        await mediaApi.uploadToS3(uploadUrl, file, cleanType);
        setProgress(85);

        // ── Step 3: Confirm upload to our backend ──────────────────────
        await mediaApi.confirmUpload(mediaId, {
          s3Key,
          fileSize: file.size,
          duration,
        });
        setProgress(100);

        return { mediaId, fileUrl, s3Key };
      } catch (err: unknown) {
        const message =
          (err as unknown as { response: { data: { message: string } } })
            ?.response?.data?.message ||
          (err as Error)?.message ||
          "Upload failed. Please try again.";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return { upload, isUploading, progress, error, reset };
};
