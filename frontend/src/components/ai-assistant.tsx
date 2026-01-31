import { PlaySummary } from "./play-summary"
import { Timeline } from "./timeline"
import { Chat } from "./chat"
import { Upload, Sparkles } from "lucide-react"

interface PlaySummaryData {
  playType: string
  formation: string
  keyPlayers: string[]
  result: string
  yardsGained: number
  details: string
}

interface TimelineEvent {
  id: string
  time: number
  label: string
  type: "snap" | "action" | "result" | "key"
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AIAssistantProps {
  playSummary: PlaySummaryData | null
  timelineEvents: TimelineEvent[]
  chatMessages: ChatMessage[]
  currentTime: number
  isAnalyzing: boolean
  isChatLoading: boolean
  hasVideo: boolean
  onSeek: (time: number) => void
  onSendMessage: (message: string) => void
}

export function AIAssistant({
  playSummary,
  timelineEvents,
  chatMessages,
  currentTime,
  isAnalyzing,
  isChatLoading,
  hasVideo,
  onSeek,
  onSendMessage,
}: AIAssistantProps) {
  if (!hasVideo) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-secondary p-4 mb-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Upload a clip to get started
        </h3>
        <p className="text-sm text-muted-foreground max-w-[200px]">
          Drop a football video on the left to begin AI-powered analysis
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="rounded-lg bg-primary/20 p-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold text-foreground">AI Analysis</h2>
      </div>

      {/* Play Summary */}
      <div className="border-b border-border p-3">
        <PlaySummary data={playSummary} isAnalyzing={isAnalyzing} />
      </div>

      {/* Timeline - Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
        <Timeline
          events={timelineEvents}
          currentTime={currentTime}
          onSeek={onSeek}
        />
      </div>

      {/* Chat - Fixed at bottom */}
      <div className="h-[280px] shrink-0">
        <Chat
          messages={chatMessages}
          onSendMessage={onSendMessage}
          isLoading={isChatLoading}
          hasVideo={hasVideo}
        />
      </div>
    </div>
  )
}
