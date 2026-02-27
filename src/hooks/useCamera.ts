import { useState, useEffect, useRef, useCallback } from 'react';

export type FacingMode = 'user' | 'environment';

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  facingMode: FacingMode;
  hasPermission: boolean | null;
  permissionError: string | null;
  isReady: boolean;
  flipCamera: () => void;
  stopCamera: () => void;
  takePhoto: () => string | null;   // returns base64 data URL
}

export const useCamera = (): UseCameraReturn => {
  const videoRef        = useRef<HTMLVideoElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const [stream, setStream]               = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode]       = useState<FacingMode>('user');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isReady, setIsReady]             = useState(false);

  // ── Start camera stream ──────────────────────────────────────────
  const startCamera = useCallback(async (mode: FacingMode) => {
    // stop any existing stream before starting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    setIsReady(false);
    setPermissionError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true, // always request audio so video snaps have sound
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => setIsReady(true);
      }
    } catch (err: unknown) {
      setHasPermission(false);
      const errorName = err instanceof Error ? err.name : String(err);
      if (errorName === 'NotAllowedError') {
        setPermissionError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errorName === 'NotFoundError') {
        setPermissionError('No camera found on this device.');
      } else if (errorName === 'NotReadableError') {
        setPermissionError('Camera is already in use by another application.');
      } else {
        setPermissionError('Could not access camera. Please try again.');
      }
    }
  }, []);

  // start on mount and when facingMode changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCamera(facingMode);
    return () => {
      // clean up stream when component using the camera unmounts
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, startCamera]);

  // ── Flip between front and back camera ──────────────────────────
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // ── Stop the camera stream completely ────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
    setIsReady(false);
  }, []);

  // ── Capture a still photo from the video stream ──────────────────
  // draws the current video frame to a canvas and exports as JPEG
  const takePhoto = useCallback((): string | null => {
    if (!videoRef.current) return null;

    const video  = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // mirror the image if using front camera to match what user sees
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  }, [facingMode]);

  return {
    videoRef,
    stream,
    facingMode,
    hasPermission,
    permissionError,
    isReady,
    flipCamera,
    stopCamera,
    takePhoto,
  };
};