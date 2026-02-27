import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingMode  = 'video' | 'audio';
export type RecordingState = 'idle' | 'recording' | 'stopped';

export interface UseMediaRecorderReturn {
  recordingState: RecordingState;
  recordingMode:  RecordingMode;
  elapsedSeconds: number;
  startRecording: (stream: MediaStream, mode: RecordingMode) => void;
  stopRecording:  () => void;
  recordedBlob:   Blob | null;
  recordedUrl:    string | null;
  resetRecording: () => void;
}

const MAX_DURATION_SECONDS = 60;

// detects the best supported MIME type for the current browser
// Chrome/Firefox use webm, Safari uses mp4
const getSupportedMimeType = (mode: RecordingMode): string => {
  const videoCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  const audioCandidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  const candidates = mode === 'video' ? videoCandidates : audioCandidates;

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return mode === 'video' ? 'video/webm' : 'audio/webm';
};

export const useMediaRecorder = (): UseMediaRecorderReturn => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingMode,  setRecordingMode]  = useState<RecordingMode>('video');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBlob,   setRecordedBlob]   = useState<Blob | null>(null);
  const [recordedUrl,    setRecordedUrl]    = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<BlobPart[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimerRef      = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current)    clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
  }, []);

  const startRecording = useCallback((
    stream: MediaStream,
    mode: RecordingMode
  ) => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);

    chunksRef.current = [];
    setElapsedSeconds(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingMode(mode);

    // for audio-only mode, create a stream with only audio tracks
    const recordingStream = mode === 'audio'
      ? new MediaStream(stream.getAudioTracks())
      : stream;

    const mimeType = getSupportedMimeType(mode);
    const recorder = new MediaRecorder(recordingStream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setRecordingState('stopped');
    };

    recorder.start(250); // collect a chunk every 250ms
    setRecordingState('recording');

    // elapsed seconds ticker
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // hard 60-second cutoff
    maxTimerRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_DURATION_SECONDS * 1000);
  }, [recordedUrl, stopRecording]);

  const resetRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordingState('idle');
    setElapsedSeconds(0);
    setRecordedBlob(null);
    setRecordedUrl(null);
    chunksRef.current = [];
  }, [recordedUrl]);

  return {
    recordingState,
    recordingMode,
    elapsedSeconds,
    startRecording,
    stopRecording,
    recordedBlob,
    recordedUrl,
    resetRecording,
  };
};