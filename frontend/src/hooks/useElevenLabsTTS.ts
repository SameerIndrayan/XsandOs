import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSpeech } from '../services/api';

interface UseElevenLabsTTSOptions {
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseElevenLabsTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for text-to-speech using Eleven Labs API
 * Provides high-quality, natural-sounding voice synthesis
 */
export const useElevenLabsTTS = (
  options: UseElevenLabsTTSOptions = {}
): UseElevenLabsTTSReturn => {
  const { voiceId, onStart, onEnd, onError } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Cleanup previous audio URL
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Generate speech from Eleven Labs
      const audioUrl = await generateSpeech(text, voiceId);
      audioUrlRef.current = audioUrl;

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        onStart?.();
      };

      audio.onended = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      audio.onerror = () => {
        const errorMsg = 'Failed to play audio';
        setError(errorMsg);
        setIsSpeaking(false);
        onError?.(errorMsg);
      };

      setIsLoading(false);
      await audio.play();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMsg);
      setIsLoading(false);
      onError?.(errorMsg);
    }
  }, [voiceId, onStart, onEnd, onError]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
      onEnd?.();
    }
  }, [onEnd]);

  return {
    speak,
    stop,
    isSpeaking,
    isLoading,
    error,
  };
};
