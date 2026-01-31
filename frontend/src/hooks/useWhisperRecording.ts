import { useState, useCallback, useRef } from 'react';
import { transcribeAudio } from '../services/api';

interface UseWhisperRecordingOptions {
  onTranscription?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseWhisperRecordingReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
  isSupported: boolean;
}

/**
 * Hook for recording audio and transcribing with Whisper API
 * Provides more accurate transcription than Web Speech API
 */
export const useWhisperRecording = (
  options: UseWhisperRecordingOptions = {}
): UseWhisperRecordingReturn => {
  const { onTranscription, onStart, onEnd, onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() =>
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const errorMsg = 'Audio recording is not supported in this browser';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setError(null);
      audioChunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      onStart?.();
    } catch (err) {
      const errorMsg = err instanceof Error
        ? (err.name === 'NotAllowedError'
            ? 'Microphone access denied. Please allow microphone access.'
            : err.message)
        : 'Failed to start recording';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [isSupported, onStart, onError]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        setIsRecording(false);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm'
        });

        // Check if we have audio data
        if (audioBlob.size < 100) {
          const errorMsg = 'No audio recorded. Please try again.';
          setError(errorMsg);
          onError?.(errorMsg);
          onEnd?.();
          resolve(null);
          return;
        }

        // Transcribe with Whisper
        setIsTranscribing(true);
        try {
          const result = await transcribeAudio(audioBlob);
          const text = result.text.trim();

          if (text) {
            onTranscription?.(text);
          }

          setIsTranscribing(false);
          onEnd?.();
          resolve(text || null);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Transcription failed';
          setError(errorMsg);
          onError?.(errorMsg);
          setIsTranscribing(false);
          onEnd?.();
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, onTranscription, onEnd, onError]);

  return {
    isRecording,
    isTranscribing,
    startRecording,
    stopRecording,
    error,
    isSupported,
  };
};
