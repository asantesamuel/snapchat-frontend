import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SnapCamera from '@/components/media/SnapCamera';
import MediaPreview from '@/components/media/MediaPreview';
import SendSnapModal from '@/components/media/SendSnapModal';
import StoryPublishModal from '@/components/stories/StoryPublishModal';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { MessageType } from '@/types/message.types';
import type { PreviewType } from '@/components/media/MediaPreview';

// ─────────────────────────────────────────────────────────────────────────────
// CameraPage orchestrates the full snap creation flow.
//
// It cycles through three distinct page states:
//
//   STATE 1: 'camera'   — SnapCamera renders the full-screen live viewfinder.
//                         The user taps to take a photo, holds to record video,
//                         or taps the mic button for an audio note.
//
//   STATE 2: 'preview'  — MediaPreview renders the captured photo/video/audio
//                         for review. Three actions are available:
//                           • Retake   → back to STATE 1
//                           • Send     → opens SendSnapModal overlay
//                           • Story    → opens StoryPublishModal overlay
//
//   STATE 3: (modals)   — SendSnapModal or StoryPublishModal render over the
//                         preview as full-screen overlays.
//
// PHOTO BLOB CONVERSION
// ─────────────────────
// Photos are captured as base64 data URLs from canvas.toDataURL() inside
// useCamera.takePhoto(). This format is convenient for <img> preview but
// cannot be sent directly to S3. To convert it back to a Blob we call:
//
//   const response = await fetch(dataUrl);   // fetch treats data: URIs
//   const blob     = await response.blob();  // correctly as binary data
//
// This is a browser-native approach that works in all modern browsers without
// any additional libraries. The resulting blob is identical to what you would
// get from canvas.toBlob() but synchronously available from the data URL.
//
// VIDEO/AUDIO BLOB
// ────────────────
// Video and audio are captured directly as Blob objects by MediaRecorder
// inside useMediaRecorder. They are stored in captured.blob and need no
// conversion — they go straight to upload().
// ─────────────────────────────────────────────────────────────────────────────

// All the state representing what was just captured in the viewfinder
interface CapturedMedia {
  type:      PreviewType;    // 'photo' | 'video' | 'audio'
  dataUrl?:  string;         // base64 — photo only, used for <img> preview
  blobUrl?:  string;         // object URL — video/audio only, used for <video>/<audio>
  blob?:     Blob;           // raw binary — video/audio only, sent to S3
  mimeType:  string;         // e.g. 'image/jpeg', 'video/webm', 'audio/webm'
  duration?: number;         // seconds — video/audio only
}

// The three top-level states this page renders
type PageState = 'camera' | 'preview' | 'send_modal' | 'story_modal';

// ─────────────────────────────────────────────────────────────────────────────

const CameraPage = () => {
  const navigate = useNavigate();

  // useMediaUpload is used only for the "Send Snap" flow (not Story).
  // Story upload is handled inside StoryPublishModal which has its own
  // useMediaUpload instance with its own progress state.
  const { upload, isUploading: isSendUploading, progress: sendProgress } =
    useMediaUpload();

  const [pageState, setPageState] = useState<PageState>('camera');
  const [captured, setCaptured]   = useState<CapturedMedia | null>(null);

  // ─── Capture handlers (called by SnapCamera) ────────────────────────────

  const handlePhoto = (dataUrl: string, mimeType: string) => {
    // Store the data URL for <img> preview.
    // We do NOT convert to Blob here — that happens lazily on send/story
    // so the user sees the preview instantly without any processing delay.
    setCaptured({ type: 'photo', dataUrl, mimeType });
    setPageState('preview');
  };

  const handleVideo = (
    blob:     Blob,
    blobUrl:  string,
    mimeType: string,
    duration: number
  ) => {
    // Store both the Blob (for upload) and the object URL (for <video> preview)
    setCaptured({ type: 'video', blob, blobUrl, mimeType, duration });
    setPageState('preview');
  };

  const handleAudio = (
    blob:     Blob,
    blobUrl:  string,
    mimeType: string,
    duration: number
  ) => {
    setCaptured({ type: 'audio', blob, blobUrl, mimeType, duration });
    setPageState('preview');
  };

  // ─── Retake — discard capture and return to camera ───────────────────────

  const handleRetake = () => {
    // Clean up the object URL to free browser memory
    if (captured?.blobUrl) {
      URL.revokeObjectURL(captured.blobUrl);
    }
    setCaptured(null);
    setPageState('camera');
  };

  // ─── Convert captured media to a Blob ready for upload ──────────────────
  //
  // This is the central helper used by both send and story flows.
  // Returns { blob, mimeType } or null on failure.
  //
  // WHY fetch(dataUrl)?
  // The browser allows fetch() to accept a data: URI. It decodes the base64
  // payload internally and .blob() returns the decoded binary. This avoids
  // manual atob() + Uint8Array conversion which is error-prone and verbose.

  const getUploadBlob = async (): Promise<
    { blob: Blob; mimeType: string } | null
  > => {
    if (!captured) return null;

    if (captured.type === 'photo') {
      if (!captured.dataUrl) return null;
      try {
        // Convert data URL → Blob using browser-native fetch
        const response = await fetch(captured.dataUrl);
        const blob     = await response.blob();
        return { blob, mimeType: 'image/jpeg' };
      } catch {
        toast.error('Failed to process photo. Please retake.');
        return null;
      }
    }

    // Video and audio are already Blobs from MediaRecorder
    if (captured.blob) {
      return { blob: captured.blob, mimeType: captured.mimeType };
    }

    return null;
  };

  // ─── Send as Snap ────────────────────────────────────────────────────────
  //
  // Called by SendSnapModal with the list of recipient user IDs and the
  // ephemeral flag. Flow:
  //   1. Convert captured media to Blob
  //   2. Upload to S3 via useMediaUpload (presign → PUT → confirm)
  //   3. Emit SEND_MESSAGE via Socket.IO to each recipient
  //   4. Navigate to /chat on success

  const handleSendSnap = async (
    recipientIds: string[],
    isEphemeral:  boolean
  ) => {
    if (!captured) return;

    const uploadData = await getUploadBlob();
    if (!uploadData) return;

    const result = await upload(
      uploadData.blob,
      uploadData.mimeType,
      captured.duration
    );
    if (!result) return; // upload() already toasted the error

    // Map capture type to message type enum
    const messageType =
      captured.type === 'photo'
        ? MessageType.IMAGE
        : captured.type === 'video'
          ? MessageType.VIDEO
          : MessageType.AUDIO;

    // Send to each recipient via Socket.IO
    // We do not use the REST API here — the socket delivers the message
    // in real time and the backend persists it from the socket handler
    const socket = getSocket();
    for (const receiverId of recipientIds) {
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        receiverId,
        content:     result.fileUrl,   // S3 public URL stored as message content
        messageType,
        isEphemeral,
        mediaId:     result.mediaId,   // backend uses this to link to the media record
      });
    }

    const count = recipientIds.length;
    toast.success(
      `Snap sent to ${count} ${count === 1 ? 'friend' : 'friends'}! 🔥`
    );
    setPageState('camera');
    setCaptured(null);
    navigate('/chat');
  };

  // ─── Story success callback ───────────────────────────────────────────────
  //
  // StoryPublishModal handles the entire upload + publish flow internally.
  // When it succeeds it calls this callback so CameraPage can navigate away.

  const handleStorySuccess = () => {
    setPageState('camera');
    setCaptured(null);
    navigate('/stories');
  };

  // ─── Build the story media blob for StoryPublishModal ───────────────────
  //
  // StoryPublishModal needs a raw Blob to upload. We compute this lazily
  // only when the user taps "Story" — no processing happens until that point.
  //
  // For photos this involves the async fetch(dataUrl) conversion.
  // For video/audio we just pass captured.blob directly.
  //
  // Because StoryPublishModal accepts a blob prop we pre-compute it when
  // the modal opens. A null result means the conversion failed.

  const [storyBlob, setStoryBlob] = useState<Blob | null>(null);

  const handleOpenStoryModal = async () => {
    if (!captured) return;
    const uploadData = await getUploadBlob();
    if (!uploadData) return;
    setStoryBlob(uploadData.blob);
    setPageState('story_modal');
  };

  // Determine the story media type string for StoryPublishModal
  // ('image' | 'video') — audio is treated as video in the stories system
  const storyMediaType =
    captured?.type === 'photo' ? 'image' : 'video';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── STATE 1: Live camera viewfinder ─────────────────────────────── */}
      {pageState === 'camera' && (
        <SnapCamera
          onPhoto={handlePhoto}
          onVideo={handleVideo}
          onAudio={handleAudio}
          onClose={() => navigate(-1)}
        />
      )}

      {/* ── STATE 2: Review captured media ──────────────────────────────── */}
      {(pageState === 'preview' ||
        pageState === 'send_modal' ||
        pageState === 'story_modal') &&
        captured && (
          <MediaPreview
            type={captured.type}
            dataUrl={captured.dataUrl}
            blobUrl={captured.blobUrl}
            mimeType={captured.mimeType}
            onRetake={handleRetake}
            onSendSnap={() => setPageState('send_modal')}
            onPostStory={handleOpenStoryModal}
            // Show the upload spinner on the preview when the send flow
            // is uploading. Story upload happens inside StoryPublishModal
            // so we do not show the spinner for that flow here.
            isUploading={isSendUploading && pageState === 'send_modal'}
            uploadProgress={sendProgress}
          />
        )}

      {/* ── MODAL: Send to friends ───────────────────────────────────────── */}
      {pageState === 'send_modal' && (
        <SendSnapModal
          onSend={handleSendSnap}
          onClose={() => setPageState('preview')}
          isUploading={isSendUploading}
        />
      )}

      {/* ── MODAL: Post as Story ─────────────────────────────────────────── */}
      {/*                                                                      */}
      {/* StoryPublishModal owns the upload + publish flow entirely.           */}
      {/* It receives:                                                          */}
      {/*   mediaBlob  — the raw binary to upload to S3                        */}
      {/*   mediaType  — 'image' or 'video' (maps to StoryType enum)           */}
      {/*   mimeType   — full MIME string e.g. 'image/jpeg', 'video/webm'      */}
      {/*   duration   — video duration in seconds (optional)                  */}
      {/*   onClose    — go back to preview                                     */}
      {/*   onSuccess  — navigate to /stories after publish                    */}
      {pageState === 'story_modal' && storyBlob && captured && (
        <StoryPublishModal
          mediaBlob={storyBlob}
          mediaType={storyMediaType}
          mimeType={captured.mimeType}
          duration={captured.duration}
          onClose={() => setPageState('preview')}
          onSuccess={handleStorySuccess}
        />
      )}
    </>
  );
};

export default CameraPage;