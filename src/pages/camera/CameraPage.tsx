import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SnapCamera from '@/components/media/SnapCamera';
import MediaPreview from '@/components/media/MediaPreview';
import SendSnapModal from '@/components/media/SendSnapModal';
import { useMediaUpload } from '@/hooks/useMediaUpload';
// import { messagesApi } from '@/api/messages.api';
import { storiesApi } from '@/api/stories.api';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { MessageType } from '@/types/message.types';
import { StoryType, StoryVisibility } from '@/types/story.types';
import type { PreviewType } from '@/components/media/MediaPreview';

// all the media state for the captured snap in one interface
interface CapturedMedia {
  type:     PreviewType;
  dataUrl?: string;   // photo only
  blobUrl?: string;   // video/audio only
  blob?:    Blob;     // video/audio only
  mimeType: string;
  duration?: number;  // video/audio duration in seconds
}

type PageState = 'camera' | 'preview' | 'send';

const CameraPage = () => {
  const navigate = useNavigate();
  const { upload, isUploading, progress } = useMediaUpload();

  const [pageState, setPageState]     = useState<PageState>('camera');
  const [captured, setCaptured]       = useState<CapturedMedia | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // ── Capture handlers ───────────────────────────────────────────────
  const handlePhoto = (dataUrl: string, mimeType: string) => {
    setCaptured({ type: 'photo', dataUrl, mimeType });
    setPageState('preview');
  };

  const handleVideo = (blob: Blob, blobUrl: string, mimeType: string, duration: number) => {
    setCaptured({ type: 'video', blob, blobUrl, mimeType, duration });
    setPageState('preview');
  };

  const handleAudio = (blob: Blob, blobUrl: string, mimeType: string, duration: number) => {
    setCaptured({ type: 'audio', blob, blobUrl, mimeType, duration });
    setPageState('preview');
  };

  // ── Retake — go back to camera ─────────────────────────────────────
  const handleRetake = () => {
    setCaptured(null);
    setPageState('camera');
  };

  // ── Post as Story ──────────────────────────────────────────────────
  const handlePostStory = async () => {
    if (!captured) return;

    try {
      let blob: Blob;
      let mimeType = captured.mimeType;

      if (captured.type === 'photo' && captured.dataUrl) {
        // convert base64 data URL to Blob
        const response = await fetch(captured.dataUrl);
        blob = await response.blob();
        mimeType = 'image/jpeg';
      } else if (captured.blob) {
        blob = captured.blob;
      } else return;

      const result = await upload(blob, mimeType, captured.duration);
      if (!result) return;

      await storiesApi.publish({
        mediaUrl:   result.fileUrl,
        s3Key:      result.s3Key,
        storyType:  captured.type === 'photo' ? StoryType.IMAGE : StoryType.VIDEO,
        visibility: StoryVisibility.PUBLIC,
        duration:   captured.duration,
      });

      toast.success('Story posted! 🎉');
      navigate('/stories');
    } catch (err: unknown) {
      toast.error((err as unknown as { response: { data: { message: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to post story");
    }
  };

  // ── Send as Snap ───────────────────────────────────────────────────
  const handleSendSnap = async (recipientIds: string[], isEphemeral: boolean) => {
    if (!captured) return;

    try {
      let blob: Blob;
      let mimeType = captured.mimeType;

      if (captured.type === 'photo' && captured.dataUrl) {
        const response = await fetch(captured.dataUrl);
        blob = await response.blob();
        mimeType = 'image/jpeg';
      } else if (captured.blob) {
        blob = captured.blob;
      } else return;

      // upload the file to S3 first
      const result = await upload(blob, mimeType, captured.duration);
      if (!result) return;

      // determine message type
      const messageType = captured.type === 'photo'
        ? MessageType.IMAGE
        : captured.type === 'video'
          ? MessageType.VIDEO
          : MessageType.AUDIO;

      // send to each recipient via Socket.IO
      const socket = getSocket();
      for (const receiverId of recipientIds) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
          receiverId,
          content:     result.fileUrl,
          messageType,
          isEphemeral,
          mediaId:     result.mediaId,
        });
      }

      const count = recipientIds.length;
      toast.success(`Snap sent to ${count} ${count === 1 ? 'friend' : 'friends'}! 🔥`);
      setShowSendModal(false);
      navigate('/chat');
    } catch (err: unknown) {
      toast.error((err as unknown as { response: { data: { message: string } } })
          ?.response?.data?.message ||
        (err as Error)?.message ||
        "Failed to send snap");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Camera viewfinder */}
      {pageState === 'camera' && (
        <SnapCamera
          onPhoto={handlePhoto}
          onVideo={handleVideo}
          onAudio={handleAudio}
          onClose={() => navigate(-1)}
        />
      )}

      {/* Preview / review captured media */}
      {pageState === 'preview' && captured && (
        <MediaPreview
          type={captured.type}
          dataUrl={captured.dataUrl}
          blobUrl={captured.blobUrl}
          mimeType={captured.mimeType}
          onRetake={handleRetake}
          onSendSnap={() => setShowSendModal(true)}
          onPostStory={handlePostStory}
          isUploading={isUploading && !showSendModal}
          uploadProgress={progress}
        />
      )}

      {/* Send to friends modal */}
      {showSendModal && (
        <SendSnapModal
          onSend={handleSendSnap}
          onClose={() => setShowSendModal(false)}
          isUploading={isUploading}
        />
      )}
    </>
  );
};

export default CameraPage;