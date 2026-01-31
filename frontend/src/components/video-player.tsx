"use client"

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Maximize,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PlayerAnnotation {
  id: string
  x: number
  y: number
  color: string
  label: string
  team: "offense" | "defense"
}

interface VideoPlayerProps {
  videoUrl: string | null
  isAnalyzing: boolean
  onFileUpload: (file: File) => void
  currentTime: number
  onTimeUpdate: (time: number) => void
  annotations?: PlayerAnnotation[]
}

export function VideoPlayer({
  videoUrl,
  isAnalyzing,
  onFileUpload,
  currentTime,
  onTimeUpdate,
  annotations = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
    }
  }, [onTimeUpdate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          togglePlay()
          break
        case "ArrowLeft":
          e.preventDefault()
          seekRelative(-5)
          break
        case "ArrowRight":
          e.preventDefault()
          seekRelative(5)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const seekRelative = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(
      0,
      Math.min(video.duration, video.currentTime + seconds)
    )
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = value[0]
    onTimeUpdate(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = value[0]
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleSpeedChange = (value: string) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = parseFloat(value)
    setPlaybackSpeed(value)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("video/")) {
      onFileUpload(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!videoUrl) {
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border bg-card/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-secondary p-6">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Drop a football clip to analyze
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop a video file, or click to browse
            </p>
          </div>
          <label>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-card"
    >
      {/* Video */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          onClick={togglePlay}
        />

        {/* Player Annotations Overlay */}
        {showAnnotations && annotations.length > 0 && (
          <TooltipProvider>
            <div className="absolute inset-0 pointer-events-none">
              {annotations.map((player) => (
                <Tooltip key={player.id} open={hoveredPlayer === player.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-foreground/50 transition-transform hover:scale-125 pointer-events-auto"
                      style={{
                        left: `${player.x}%`,
                        top: `${player.y}%`,
                        backgroundColor: player.color,
                      }}
                      onMouseEnter={() => setHoveredPlayer(player.id)}
                      onMouseLeave={() => setHoveredPlayer(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-card text-card-foreground border-border"
                  >
                    <p className="font-medium">{player.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        )}

        {/* Analyzing Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-lg font-medium text-foreground">
                Analyzing play...
              </p>
            </div>
          </div>
        )}

        {/* Play/Pause overlay button */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlaying
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-100"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/70"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-4 pt-12 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <span className="ml-2 font-mono text-sm text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showAnnotations ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowAnnotations(!showAnnotations)}
            >
              {showAnnotations ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
            </Button>

            <Select value={playbackSpeed} onValueChange={handleSpeedChange}>
              <SelectTrigger className="h-9 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.25">0.25x</SelectItem>
                <SelectItem value="0.5">0.5x</SelectItem>
                <SelectItem value="1">1x</SelectItem>
                <SelectItem value="1.5">1.5x</SelectItem>
                <SelectItem value="2">2x</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
