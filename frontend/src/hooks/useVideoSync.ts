import { useEffect, useRef, useCallback, RefObject } from 'react';

/**
 * Hook to synchronize canvas rendering with video playback
 * Uses requestAnimationFrame during playback for smooth 60fps updates
 * Falls back to event listeners when paused
 */
export const useVideoSync = (
  videoRef: RefObject<HTMLVideoElement | null>,
  onTimeUpdate: (currentTime: number) => void
): void => {
  const animationFrameRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  const tick = useCallback(() => {
    if (videoRef.current && isPlayingRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
      animationFrameRef.current = requestAnimationFrame(tick);
    }
  }, [videoRef, onTimeUpdate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      isPlayingRef.current = true;
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    const handlePause = () => {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // One final update to ensure we're synced at pause point
      onTimeUpdate(video.currentTime);
    };

    const handleSeeked = () => {
      // Immediate update on seek, even when paused
      onTimeUpdate(video.currentTime);
    };

    const handleEnded = () => {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('ended', handleEnded);

    // Initial sync
    onTimeUpdate(video.currentTime);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoRef, tick, onTimeUpdate]);
};
