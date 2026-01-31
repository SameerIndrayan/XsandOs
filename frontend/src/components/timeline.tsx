"use client"

import { cn } from "@/lib/utils"

interface TimelineEvent {
  id: string
  time: number
  label: string
  type: "snap" | "action" | "result" | "key"
}

interface TimelineProps {
  events: TimelineEvent[]
  currentTime: number
  onSeek: (time: number) => void
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function Timeline({ events, currentTime, onSeek }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          Upload a clip to see the timeline
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Key Moments
      </h3>
      <div className="space-y-1">
        {events.map((event, index) => {
          const isActive = currentTime >= event.time && 
            (index === events.length - 1 || currentTime < events[index + 1]?.time)
          const isPast = currentTime > event.time

          return (
            <button
              key={event.id}
              onClick={() => onSeek(event.time)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                isActive
                  ? "bg-primary/20 text-foreground"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Timeline dot and line */}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "h-2.5 w-2.5 rounded-full border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary"
                      : isPast
                      ? "border-primary/50 bg-primary/50"
                      : "border-border bg-secondary group-hover:border-muted-foreground"
                  )}
                />
                {index < events.length - 1 && (
                  <div
                    className={cn(
                      "absolute top-3 h-8 w-0.5",
                      isPast ? "bg-primary/30" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-foreground" : ""
                  )}
                >
                  {event.label}
                </span>
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {formatTime(event.time)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
