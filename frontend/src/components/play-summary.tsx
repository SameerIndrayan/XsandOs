import { useState } from "react"
import { ChevronDown, ChevronUp, Zap, Users, Target, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlaySummaryData {
  playType: string
  formation: string
  keyPlayers: string[]
  result: string
  yardsGained: number
  details: string
}

interface PlaySummaryProps {
  data: PlaySummaryData | null
  isAnalyzing: boolean
}

export function PlaySummary({ data, isAnalyzing }: PlaySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isAnalyzing) {
    return (
      <div className="rounded-lg bg-card p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Analyzing play...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-lg bg-card p-4 border border-border">
        <p className="text-sm text-muted-foreground">
          Upload a clip to see play analysis
        </p>
      </div>
    )
  }

  const isPositivePlay = data.yardsGained > 5

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
              <Zap className="h-3 w-3" />
              {data.playType}
            </span>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
              isPositivePlay
                ? "bg-success/20 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Trophy className="h-3 w-3" />
            {data.yardsGained > 0 ? "+" : ""}
            {data.yardsGained} yards
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Formation:</span>
            <span className="font-medium text-foreground">{data.formation}</span>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="text-muted-foreground">Key Players:</span>
            <div className="flex flex-wrap gap-1.5">
              {data.keyPlayers.map((player, i) => (
                <span
                  key={i}
                  className="inline-flex rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                >
                  {player}
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Result:</span>{" "}
            {data.result}
          </p>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-center gap-1 border-t border-border bg-secondary/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {isExpanded ? (
          <>
            <span>Less details</span>
            <ChevronUp className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            <span>More details</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-secondary/30 p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {data.details}
          </p>
        </div>
      )}
    </div>
  )
}
