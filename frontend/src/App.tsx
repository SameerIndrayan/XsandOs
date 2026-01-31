import { useState, useCallback, useMemo } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { VoiceQA } from './components/VoiceQA';
import { backendTestData } from './data/backendTestData';
import { transformBackendData, extractPlayInfo } from './utils/transformBackendData';
import './styles/variables.css';
import './styles/App.css';

function App() {
  const [videoTime, setVideoTime] = useState(0);
  const [isListening, setIsListening] = useState(false);

  // Transform backend data to frontend format
  const annotations = useMemo(() => transformBackendData(backendTestData), []);
  const playInfo = useMemo(() => extractPlayInfo(backendTestData), []);

  const handleTimeUpdate = useCallback((time: number) => {
    setVideoTime(time);
  }, []);

  const handleListeningChange = useCallback((listening: boolean) => {
    setIsListening(listening);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo">
              <div className="logo-icon">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Football shape */}
                  <ellipse cx="20" cy="20" rx="18" ry="12" fill="url(#footballGradient)" />
                  {/* Laces */}
                  <path d="M20 10V30" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M15 14H25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14 18H26" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14 22H26" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 26H25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="footballGradient" x1="2" y1="8" x2="38" y2="32">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="logo-text">
                <span className="logo-title">X&Os</span>
                <span className="logo-subtitle">Play Analysis</span>
              </div>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-badge">
              <span className="badge-dot"></span>
              <span>AI-Powered</span>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="content-wrapper">
          {/* Play Title Section */}
          <div className="play-header">
            <div className="play-info">
              <h1 className="play-title">Eagles vs Ravens - 3rd & 6</h1>
              <p className="play-description">
                {playInfo.summary}
              </p>
            </div>
            <div className="play-tags">
              <span className="tag tag-primary">Eagles</span>
              <span className="tag tag-accent">Ravens</span>
              <span className="tag">3rd Down</span>
            </div>
          </div>

          {/* Video Player */}
          <div className="player-section">
            <VideoPlayer
              videoSrc="/test.mp4"
              annotations={annotations}
              onTimeUpdate={handleTimeUpdate}
              externalPause={isListening}
            />
          </div>

          {/* Info Cards */}
          <div className="info-grid">
            <div className="info-card">
              <div className="info-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Play Duration</span>
                <span className="info-card-value">{playInfo.duration.toFixed(1)}s</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-icon highlight">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Players Tracked</span>
                <span className="info-card-value">{playInfo.playerCount} Players</span>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card-icon accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
              </div>
              <div className="info-card-content">
                <span className="info-card-label">Key Frames</span>
                <span className="info-card-value">{playInfo.frameCount} Frames</span>
              </div>
            </div>
          </div>

          {/* Voice Q&A Instructions */}
          <div className="qa-instructions">
            <div className="qa-instructions-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </div>
            <div className="qa-instructions-content">
              <h3>Voice Q&A</h3>
              <p>Click the microphone button and ask questions about the play. The video will pause while you speak, and the AI will explain what's happening.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Voice Q&A Component */}
      <VoiceQA
        videoTimestamp={videoTime}
        onListeningChange={handleListeningChange}
      />

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>Built for Gemini 3 SuperHack</p>
          <span className="footer-divider">|</span>
          <p>Powered by Google Gemini Vision</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
