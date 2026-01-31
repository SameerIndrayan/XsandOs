import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AnnotationCanvas } from '../AnnotationCanvas';
import { TermsButton } from '../TermsButton';
import { TermsDrawer } from '../TermsDrawer';
import { PlayTermsButton } from '../PlayTermsButton';
import { PlayTermsModal } from '../PlayTermsModal';
import { useCanvasResize } from '../../hooks/useCanvasResize';
import { useAnnotationFrames } from '../../hooks/useAnnotationFrames';
import { AnnotationData, InterpolatedFrame, TerminologyAnnotation, PlayerAnnotation, ArrowAnnotation } from '../../types/annotations';
import { BroadcastOverlayManager } from '../../utils/broadcastOverlayManager';
import { extractPlayTerms } from '../../utils/playTermsExtractor';
import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  videoSrc: string;
  annotations: AnnotationData | null;
  onTimeUpdate?: (time: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  externalPause?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoSrc,
  annotations,
  onTimeUpdate,
  onPlayingChange,
  externalPause,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null!);
  const videoRef = useRef<HTMLVideoElement>(null!);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [shortcutHint, setShortcutHint] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTermsDrawerOpen, setIsTermsDrawerOpen] = useState(false);
  const [learnMode, setLearnMode] = useState(false); // Learn mode toggle for terminology popups
  const [isPlayTermsModalOpen, setIsPlayTermsModalOpen] = useState(false);

  // Canvas dimensions for annotation positioning
  const dimensions = useCanvasResize(playerWrapperRef, videoRef, canvasRef);

  // Get interpolated annotation frame for current time
  const rawFrame = useAnnotationFrames(annotations, currentTime);

  // Initialize broadcast overlay manager (persist across renders)
  const broadcastManager = useMemo(() => {
    return new BroadcastOverlayManager();
  }, []);

  // Filter frame using broadcast overlay manager (NFL-style minimal overlays)
  const frame = useMemo((): InterpolatedFrame | null => {
    if (!rawFrame || !annotations?.frames) return null;

    // Apply broadcast overlay filtering to rawFrame data
    // The manager will filter to only key actors, top arrows, and top callouts
    const filtered = broadcastManager.filterFrame(
      rawFrame.players as PlayerAnnotation[],
      rawFrame.arrows as ArrowAnnotation[],
      rawFrame.terminology as TerminologyAnnotation[],
      learnMode
    );

    // Convert filtered players back to InterpolatedPlayer format (preserve opacity)
    const filteredPlayers = filtered.players.map(p => {
      const originalPlayer = rawFrame.players.find(rp => rp.id === p.id);
      return {
        ...p,
        opacity: originalPlayer?.opacity ?? 1,
      };
    });

    // Convert filtered arrows back to InterpolatedArrow format (preserve opacity)
    const filteredArrows = filtered.arrows.map(a => {
      const originalArrow = rawFrame.arrows.find(ra => 
        Math.abs(ra.from[0] - a.from[0]) < 0.1 &&
        Math.abs(ra.from[1] - a.from[1]) < 0.1 &&
        Math.abs(ra.to[0] - a.to[0]) < 0.1 &&
        Math.abs(ra.to[1] - a.to[1]) < 0.1
      );
      return {
        ...a,
        opacity: originalArrow?.opacity ?? 1,
        dashed: originalArrow?.dashed,
      };
    });

    // Convert filtered terminology back to InterpolatedTerminology format
    const filteredTerminology = filtered.terminology.map(t => {
      const originalTerm = rawFrame.terminology.find(rt => 
        rt.term === t.term &&
        Math.abs(rt.x - t.x) < 0.1 &&
        Math.abs(rt.y - t.y) < 0.1
      );
      return {
        ...t,
        opacity: originalTerm?.opacity ?? 1,
        startTime: originalTerm?.startTime ?? currentTime,
      };
    });

    return {
      players: filteredPlayers,
      arrows: filteredArrows,
      terminology: filteredTerminology,
    };
  }, [rawFrame, annotations, currentTime, broadcastManager, learnMode]);

  // Get all terms for current frame (for drawer)
  const allTermsForCurrentFrame = useMemo((): TerminologyAnnotation[] => {
    if (!annotations?.frames) return [];
    const currentFrame = annotations.frames.find(f => 
      Math.abs(f.timestamp - currentTime) < 0.1
    ) || annotations.frames[0];
    return currentFrame?.terminology || [];
  }, [annotations, currentTime]);

  // Extract play-specific terms from all frames
  const playTerms = useMemo(() => {
    return extractPlayTerms(annotations);
  }, [annotations]);

  // Sync current time during playback using requestAnimationFrame
  useEffect(() => {
    if (!isReady || !videoRef.current) return;

    let animationFrameId: number;

    const updateTime = () => {
      if (videoRef.current && isPlaying) {
        const time = videoRef.current.currentTime;
        setCurrentTime(time);
        onTimeUpdate?.(time);
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, isReady, onTimeUpdate]);

  // Notify parent of playing state changes
  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Handle external pause requests (e.g., when voice Q&A is listening)
  useEffect(() => {
    if (externalPause && isPlaying && videoRef.current) {
      videoRef.current.pause();
    }
  }, [externalPause, isPlaying]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsReady(true);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekBarRef.current || !videoRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;

    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  }, [duration]);

  const handleSeekBarDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return; // Only handle left mouse button drag
    handleSeekBarClick(e);
  }, [handleSeekBarClick]);

  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    showShortcutHint(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
  }, [duration]);

  const showShortcutHint = useCallback((text: string) => {
    setShortcutHint(text);
    setTimeout(() => setShortcutHint(null), 800);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          showShortcutHint(isPlaying ? 'Pause' : 'Play');
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-5);
          break;
        case 'arrowright':
        case 'l':
          // Skip forward, unless Shift+L (which is learn mode toggle)
          if (e.shiftKey && e.key.toLowerCase() === 'l') {
            e.preventDefault();
            setLearnMode(prev => !prev);
            showShortcutHint(learnMode ? 'Learn Mode Off' : 'Learn Mode On');
          } else {
            e.preventDefault();
            skip(5);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, volume + 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            setIsMuted(false);
            showShortcutHint(`Volume ${Math.round(newVol * 100)}%`);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, volume - 0.1);
            videoRef.current.volume = newVol;
            setVolume(newVol);
            if (newVol === 0) setIsMuted(true);
            showShortcutHint(`Volume ${Math.round(newVol * 100)}%`);
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          showShortcutHint(isMuted ? 'Unmuted' : 'Muted');
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'a':
          e.preventDefault();
          setAnnotationsVisible(prev => !prev);
          showShortcutHint(annotationsVisible ? 'Annotations Off' : 'Annotations On');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, toggleMute, toggleFullscreen, isPlaying, volume, isMuted, annotationsVisible, learnMode, showShortcutHint]);

  // Update playback rate when it changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Note: BroadcastOverlayManager is stateless, no reset needed

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div ref={containerRef} className={styles.container}>
      <div ref={playerWrapperRef} className={styles.playerWrapper}>
        <video
          ref={videoRef}
          src={videoSrc}
          className={styles.video}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onSeeked={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          playsInline
        />

        {/* Annotation canvas overlay */}
        <AnnotationCanvas
          canvasRef={canvasRef}
          frame={frame}
          dimensions={dimensions}
          visible={annotationsVisible && isReady}
        />

        {/* Play Terms Button - always visible when annotations are visible */}
        {annotationsVisible && playTerms.length > 0 && (
          <PlayTermsButton
            termCount={playTerms.length}
            onClick={() => setIsPlayTermsModalOpen(true)}
          />
        )}

        {/* Terms Button - only show in learn mode */}
        {annotationsVisible && learnMode && allTermsForCurrentFrame.length > 0 && (
          <TermsButton
            termCount={allTermsForCurrentFrame.length}
            onClick={() => setIsTermsDrawerOpen(true)}
          />
        )}

        {/* Play Terms Modal */}
        <PlayTermsModal
          isOpen={isPlayTermsModalOpen}
          onClose={() => setIsPlayTermsModalOpen(false)}
          terms={playTerms}
        />

        {/* Terms Drawer - only show in learn mode */}
        {learnMode && (
          <TermsDrawer
            terms={allTermsForCurrentFrame}
            players={frame?.players || []}
            isOpen={isTermsDrawerOpen}
            onClose={() => setIsTermsDrawerOpen(false)}
            onTermHover={() => {
              // Future: highlight term area on hover
            }}
            onTermClick={() => {
              // No pin/unpin in broadcast mode
            }}
          />
        )}

        {/* Shortcut hint overlay */}
        <div className={`${styles.shortcutHint} ${shortcutHint ? styles.visible : ''}`}>
          {shortcutHint}
        </div>
      </div>

      {/* Custom controls bar */}
      <div className={styles.controls}>
        {/* Progress Section */}
        <div className={styles.progressSection}>
          <div
            ref={seekBarRef}
            className={styles.seekBarContainer}
            onClick={handleSeekBarClick}
            onMouseMove={handleSeekBarDrag}
          >
            <div className={styles.seekBarTrack}>
              <div
                className={styles.seekBarProgress}
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div
              className={styles.seekBarHandle}
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <div className={styles.timeMarkers}>
            <span className={styles.timeDisplay}>{formatTime(currentTime)}</span>
            <span className={styles.timeDisplay}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div className={styles.controlsRow}>
          <div className={styles.controlsLeft}>
            {/* Volume Control */}
            <div className={styles.volumeControl}>
              <button className={styles.volumeButton} onClick={toggleMute} title="Toggle mute (M)">
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                className={styles.volumeSlider}
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
              />
            </div>
          </div>

          <div className={styles.controlsCenter}>
            {/* Skip Back */}
            <button className={styles.skipButton} onClick={() => skip(-5)} title="Skip back 5s (J)">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                <text x="12" y="14" fontSize="6" textAnchor="middle" fill="currentColor">5</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button className={styles.playButton} onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} title="Play/Pause (Space or K)">
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Forward */}
            <button className={styles.skipButton} onClick={() => skip(5)} title="Skip forward 5s (L)">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                <text x="12" y="14" fontSize="6" textAnchor="middle" fill="currentColor">5</text>
              </svg>
            </button>
          </div>

          <div className={styles.controlsRight}>
            {/* Speed Control */}
            <div className={styles.speedControl}>
              <button className={styles.speedButton}>
                <span>{playbackRate}x</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </button>
              <div className={styles.speedDropdown}>
                {playbackRates.map(rate => (
                  <button
                    key={rate}
                    className={`${styles.speedOption} ${playbackRate === rate ? styles.active : ''}`}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Annotations Toggle */}
            <button
              className={`${styles.toggleButton} ${annotationsVisible ? styles.active : ''}`}
              onClick={() => setAnnotationsVisible(prev => !prev)}
              aria-label={annotationsVisible ? 'Hide annotations' : 'Show annotations'}
              title="Toggle annotations (A)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                {annotationsVisible ? (
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                ) : (
                  <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                )}
              </svg>
            </button>

            {/* Learn Mode Toggle */}
            <button
              className={`${styles.toggleButton} ${learnMode ? styles.active : ''}`}
              onClick={() => setLearnMode(prev => !prev)}
              aria-label={learnMode ? 'Disable learn mode' : 'Enable learn mode'}
              title="Toggle learn mode - show terminology popups (Shift+L)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                {learnMode ? (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                ) : (
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.8 1.9 1.78h1.6c0-.93-.49-2.26-3.5-2.26-2.35 0-3.7 1.3-3.7 3.16 0 1.72 1.26 2.5 3.1 2.97 1.86.48 2.34 1.07 2.34 1.87 0 .77-.78 1.39-2.1 1.39-1.6 0-2.23-.72-2.23-1.64H6.04c0 1.7 1.16 2.93 3.57 2.93 2.4 0 3.79-1.4 3.79-3.47 0-1.76-1.35-2.48-3.28-2.91z" />
                )}
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              className={styles.fullscreenButton}
              onClick={toggleFullscreen}
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
