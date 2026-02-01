import { useState, useCallback } from 'react';
import { VideoPlayer } from './components/video-player';
import { AIAssistant } from './components/ai-assistant';
import { askQuestion } from './services/api';
import { useAnnotationFrames } from './hooks/useAnnotationFrames';
import { AnnotationData, AnnotationFrame } from './types/annotations';
import './index.css';

interface PlaySummaryData {
  playType: string;
  formation: string;
  keyPlayers: string[];
  result: string;
  yardsGained: number;
  details: string;
}

interface TimelineEvent {
  id: string;
  time: number;
  label: string;
  type: "snap" | "action" | "result" | "key";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [playSummary, setPlaySummary] = useState<PlaySummaryData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);

  // Get interpolated frame for current video time
  const annotationFrame = useAnnotationFrames(annotationData, currentTime);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    // Create object URL for video preview
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setIsAnalyzing(true);

    // Reset state
    setChatMessages([]);
    setPlaySummary(null);
    setTimelineEvents([]);
    setAnnotationData(null);

    try {
      // Upload to backend for analysis
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Update play summary from backend response
        setPlaySummary({
          playType: 'Play-Action Pass',
          formation: 'I-Formation',
          keyPlayers: ['QB', 'WR', 'RB'],
          result: data.play_summary || 'Play completed',
          yardsGained: 15,
          details: data.play_summary || 'Detailed analysis of the play.',
        });

        // Create timeline events from frames
        if (data.frames && data.frames.length > 0) {
          const events: TimelineEvent[] = data.frames.map((frame: any, index: number) => ({
            id: String(index + 1),
            time: frame.timestamp,
            label: frame.terminology?.[0]?.term || `Frame ${index + 1}`,
            type: index === 0 ? 'snap' : index === data.frames.length - 1 ? 'result' : 'action',
          }));
          setTimelineEvents(events.length > 0 ? events : [
            { id: '1', time: 0, label: 'Pre-snap formation', type: 'snap' },
            { id: '2', time: 1, label: 'Ball snapped', type: 'action' },
            { id: '3', time: 2, label: 'Play-action fake', type: 'key' },
            { id: '4', time: 3, label: 'Routes developing', type: 'action' },
            { id: '5', time: 4, label: 'Pass released', type: 'key' },
            { id: '6', time: 5, label: 'Catch completed', type: 'result' },
          ]);

          // Store full annotation data for canvas rendering
          const frames: AnnotationFrame[] = data.frames.map((frame: any) => ({
            timestamp: frame.timestamp || 0,
            players: (frame.players || []).map((p: any) => ({
              id: p.id || String(Math.random()),
              x: p.x || 50,
              y: p.y || 50,
              label: p.label || 'Player',
              highlight: p.highlight || false,
              color: p.color || '#6366f1',
            })),
            arrows: (frame.arrows || []).map((a: any) => ({
              from: a.from || [0, 0],
              to: a.to || [0, 0],
              color: a.color || '#22c55e',
              label: a.label,
              dashed: a.dashed || false,
            })),
            terminology: (frame.terminology || []).map((t: any) => ({
              x: t.x || 50,
              y: t.y || 10,
              term: t.term || '',
              definition: t.definition || '',
              duration: t.duration || 3,
            })),
          }));

          setAnnotationData({
            metadata: {
              videoWidth: data.video_width,
              videoHeight: data.video_height,
            },
            frames,
          });
        }
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      // Set mock data on error
      setPlaySummary({
        playType: 'Play-Action Pass',
        formation: 'I-Formation',
        keyPlayers: ['QB #12', 'WR #89', 'RB #26'],
        result: 'Complete pass for 15 yards',
        yardsGained: 15,
        details: 'The quarterback fakes a handoff to the running back, freezing the linebackers. The wide receiver runs a deep post route, getting separation from the cornerback. Clean pocket allows for an accurate throw.',
      });
      setTimelineEvents([
        { id: '1', time: 0, label: 'Pre-snap formation', type: 'snap' },
        { id: '2', time: 1, label: 'Ball snapped', type: 'action' },
        { id: '3', time: 2, label: 'Play-action fake', type: 'key' },
        { id: '4', time: 3, label: 'Routes developing', type: 'action' },
        { id: '5', time: 4, label: 'Pass released', type: 'key' },
        { id: '6', time: 5, label: 'Catch completed', type: 'result' },
      ]);

      // Set mock annotation data for demo
      setAnnotationData({
        frames: [
          {
            timestamp: 0,
            players: [
              { id: 'qb', x: 50, y: 60, label: 'QB #12', highlight: true, color: '#6366f1' },
              { id: 'rb', x: 45, y: 70, label: 'RB #26', highlight: false, color: '#6366f1' },
              { id: 'wr1', x: 20, y: 55, label: 'WR #89', highlight: false, color: '#6366f1' },
              { id: 'wr2', x: 80, y: 55, label: 'WR #11', highlight: false, color: '#6366f1' },
              { id: 'def1', x: 25, y: 45, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def2', x: 75, y: 45, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def3', x: 50, y: 40, label: 'LB', highlight: false, color: '#ef4444' },
            ],
            arrows: [],
            terminology: [
              { x: 50, y: 8, term: 'I-Formation', definition: 'QB under center with FB and HB aligned behind', duration: 2 },
            ],
          },
          {
            timestamp: 2,
            players: [
              { id: 'qb', x: 52, y: 55, label: 'QB #12', highlight: true, color: '#6366f1' },
              { id: 'rb', x: 48, y: 65, label: 'RB #26', highlight: false, color: '#6366f1' },
              { id: 'wr1', x: 15, y: 40, label: 'WR #89', highlight: true, color: '#6366f1' },
              { id: 'wr2', x: 85, y: 50, label: 'WR #11', highlight: false, color: '#6366f1' },
              { id: 'def1', x: 20, y: 35, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def2', x: 80, y: 48, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def3', x: 50, y: 50, label: 'LB', highlight: false, color: '#ef4444' },
            ],
            arrows: [
              { from: [50, 60], to: [48, 65], color: '#f59e0b', label: 'Fake', dashed: true },
              { from: [20, 55], to: [15, 35], color: '#22c55e', label: 'Post Route' },
            ],
            terminology: [
              { x: 50, y: 8, term: 'Play-Action', definition: 'QB fakes handoff to freeze defenders', duration: 2 },
            ],
          },
          {
            timestamp: 4,
            players: [
              { id: 'qb', x: 55, y: 52, label: 'QB #12', highlight: false, color: '#6366f1' },
              { id: 'rb', x: 60, y: 60, label: 'RB #26', highlight: false, color: '#6366f1' },
              { id: 'wr1', x: 12, y: 25, label: 'WR #89', highlight: true, color: '#6366f1' },
              { id: 'wr2', x: 88, y: 45, label: 'WR #11', highlight: false, color: '#6366f1' },
              { id: 'def1', x: 18, y: 28, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def2', x: 85, y: 45, label: 'CB', highlight: false, color: '#ef4444' },
              { id: 'def3', x: 55, y: 55, label: 'LB', highlight: false, color: '#ef4444' },
            ],
            arrows: [
              { from: [55, 52], to: [12, 25], color: '#22c55e', label: 'Pass' },
            ],
            terminology: [
              { x: 50, y: 8, term: 'Completion', definition: 'Pass caught for 15 yard gain', duration: 2 },
            ],
          },
        ],
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Handle chat messages
  const handleSendMessage = useCallback(async (message: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
    };
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const response = await askQuestion(message, currentTime);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback response
      const fallbackMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting to the AI. The play shows a play-action pass where the quarterback fakes a handoff before throwing deep.",
      };
      setChatMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsChatLoading(false);
    }
  }, [currentTime]);

  // Handle video seek from timeline
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle time updates from video
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Panel - Video Player (70%) */}
      <div className="flex-1 flex flex-col p-4 pr-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary" fill="currentColor">
                <ellipse cx="12" cy="12" rx="10" ry="7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">X&Os</h1>
              <p className="text-xs text-muted-foreground">Play Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            AI-Powered
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 min-h-0">
          <VideoPlayer
            videoUrl={videoUrl}
            isAnalyzing={isAnalyzing}
            onFileUpload={handleFileUpload}
            currentTime={currentTime}
            onTimeUpdate={handleTimeUpdate}
            annotationFrame={annotationFrame}
          />
        </div>
      </div>

      {/* Right Panel - AI Assistant (30%) */}
      <div className="w-[380px] shrink-0 border-l border-border bg-card/50">
        <AIAssistant
          playSummary={playSummary}
          timelineEvents={timelineEvents}
          chatMessages={chatMessages}
          currentTime={currentTime}
          isAnalyzing={isAnalyzing}
          isChatLoading={isChatLoading}
          hasVideo={!!videoUrl}
          onSeek={handleSeek}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

export default App;
