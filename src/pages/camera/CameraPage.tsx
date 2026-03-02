import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SnapCamera from '@/components/media/SnapCamera';
import MediaPreview from '@/components/media/MediaPreview';
import SendSnapModal from '@/components/media/SendSnapModal';
import ImageUploadModal from '@/components/media/ImageUploadModal';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { storiesApi } from '@/api/stories.api';
import { getSocket } from '@/socket/socket.client';
import { SOCKET_EVENTS } from '@/socket/socket.events';
import { MessageType } from '@/types/message.types';
import { StoryType, StoryVisibility } from '@/types/story.types';
import type { PreviewType } from '@/components/media/MediaPreview';

interface CapturedMedia {
  type:      PreviewType;
  dataUrl?:  string;
  blobUrl?:  string;
  blob?:     Blob;
  mimeType:  string;
  duration?: number;
}

type PageState = 'camera' | 'preview' | 'send';

const CameraPage = () => {
  const navigate = useNavigate();
  const { upload, isUploading, progress, reset } = useMediaUpload();

  const [pageState, setPageState]         = useState<PageState>('camera');
  const [captured, setCaptured]           = useState<CapturedMedia | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [galleryFile, setGalleryFile]     = useState<File | null>(null);
  const galleryInputRef                   = useRef<HTMLInputElement>(null);

  // ── Camera capture handlers ────────────────────────────────────────
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

  // ── Gallery picker ─────────────────────────────────────────────────
  // called by SnapCamera's gallery icon — opens the file input
  const handleGalleryOpen = () => {
    galleryInputRef.current?.click();
  };

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryFile(file);
    e.target.value = '';
  };

  // called when user confirms sending from the gallery modal
  const handleGalleryConfirm = async (file: File, isEphemeral: boolean) => {
    const result = await upload(file, file.type);
    if (!result) return;

    const socket = getSocket();
    // for gallery uploads, navigate back to chat and send from there
    // this mirrors how media messages are sent from ConversationPage
    toast.success('Image uploaded!');
    setGalleryFile(null);
    reset();
    navigate('/chat');
  };

  // ── Retake ─────────────────────────────────────────────────────────
  const handleRetake = () => {
    setCaptured(null);
    setPageState('camera');
  };

  // ── Post to story ──────────────────────────────────────────────────
  const handlePostStory = async () => {
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to post story');
    }
  };

  // ── Send snap ──────────────────────────────────────────────────────
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

      const result = await upload(blob, mimeType, captured.duration);
      if (!result) return;

      const messageType =
        captured.type === 'photo' ? MessageType.IMAGE :
        captured.type === 'video' ? MessageType.VIDEO :
        MessageType.AUDIO;

      const socket = getSocket();
      for (const receiverId of recipientIds) {
        socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
          receiverId,
          content:    result.fileUrl,
          messageType,
          isEphemeral,
          mediaId:    result.mediaId,
        });
      }

      const count = recipientIds.length;
      toast.success(`Snap sent to ${count} ${count === 1 ? 'friend' : 'friends'}! 🔥`);
      setShowSendModal(false);
      navigate('/chat');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send snap');
    }
  };

  return (
    <>
      {/* hidden gallery file input */}
      <input
        ref={galleryInputRef}
        title="Select image from gallery"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleGalleryFileSelect}
      />

      {pageState === 'camera' && (
        <SnapCamera
          onPhoto={handlePhoto}
          onVideo={handleVideo}
          onAudio={handleAudio}
          onGallery={handleGalleryOpen}
          onClose={() => navigate(-1)}
        />
      )}

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

      {showSendModal && (
        <SendSnapModal
          onSend={handleSendSnap}
          onClose={() => setShowSendModal(false)}
          isUploading={isUploading}
        />
      )}

      {/* gallery image preview modal */}
      {galleryFile && (
        <ImageUploadModal
          file={galleryFile}
          onConfirm={handleGalleryConfirm}
          onCancel={() => setGalleryFile(null)}
          isUploading={isUploading}
          uploadProgress={progress}
        />
      )}
    </>
  );
};

export default CameraPage;