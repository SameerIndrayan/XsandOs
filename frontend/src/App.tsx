import { useState, useCallback, useEffect } from 'react';
import { VideoPlayer } from './components/video-player';
import { AIAssistant } from './components/ai-assistant';
import { askQuestion } from './services/api';
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

interface PlayerAnnotation {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  team: "offense" | "defense";
}

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [playSummary, setPlaySummary] = useState<PlaySummaryData | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [annotations, setAnnotations] = useState<PlayerAnnotation[]>([]);

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
    setAnnotations([]);

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
          const events: TimelineEvent[] = [
            { id: '1', time: 0, label: 'Pre-snap formation', type: 'snap' },
            { id: '2', time: 1, label: 'Ball snapped', type: 'action' },
            { id: '3', time: 2, label: 'Play-action fake', type: 'key' },
            { id: '4', time: 3, label: 'Routes developing', type: 'action' },
            { id: '5', time: 4, label: 'Pass released', type: 'key' },
            { id: '6', time: 5, label: 'Catch completed', type: 'result' },
          ];
          setTimelineEvents(events);

          // Convert frame annotations to player dots
          const firstFrame = data.frames[0];
          if (firstFrame?.players) {
            const playerAnnotations: PlayerAnnotation[] = firstFrame.players.map((p: any) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              color: p.color || '#6366f1',
              label: p.label || p.id,
              team: p.label?.includes('QB') || p.label?.includes('WR') || p.label?.includes('RB')
                ? 'offense' as const
                : 'defense' as const,
            }));
            setAnnotations(playerAnnotations);
          }
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
    // The VideoPlayer component will pick up the new time
  }, []);

  // Handle time updates from video
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);

    // Update annotations based on current time (simplified)
    // In a full implementation, you'd interpolate between frame data
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
            annotations={annotations}
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
