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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InterpolatedFrame } from '../types/annotations'
import { renderPlayers, renderArrows, renderTerminology } from '../renderers'
import { useCanvasResize } from '../hooks/useCanvasResize'

interface VideoPlayerProps {
  videoUrl: string | null
  isAnalyzing: boolean
  onFileUpload: (file: File) => void
  currentTime: number
  onTimeUpdate: (time: number) => void
  annotationFrame?: InterpolatedFrame | null
}

export function VideoPlayer({
  videoUrl,
  isAnalyzing,
  onFileUpload,
  currentTime,
  onTimeUpdate,
  annotationFrame = null,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationTimeRef = useRef(Date.now())

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [isDragging, setIsDragging] = useState(false)

  // Use the canvas resize hook to handle dimensions
  const dimensions = useCanvasResize(videoContainerRef, videoRef, canvasRef)

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Only render if we have annotation data and annotations are visible
    if (showAnnotations && annotationFrame) {
      animationTimeRef.current = Date.now()
      // Render each annotation type (order matters for layering)
      renderArrows(ctx, annotationFrame.arrows, dimensions)
      renderPlayers(ctx, annotationFrame.players, dimensions, animationTimeRef.current)
      renderTerminology(ctx, annotationFrame.terminology, dimensions)
    }
  }, [annotationFrame, dimensions, showAnnotations])

  // Animation loop for highlighted players (pulsing effect)
  useEffect(() => {
    if (!showAnnotations || !annotationFrame) return

    // Only run animation loop if there are highlighted players
    const hasHighlighted = annotationFrame.players.some(p => p.highlight)
    if (!hasHighlighted) return

    let animationId: number
    const animate = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas && annotationFrame) {
        animationTimeRef.current = Date.now()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        renderArrows(ctx, annotationFrame.arrows, dimensions)
        renderPlayers(ctx, annotationFrame.players, dimensions, animationTimeRef.current)
        renderTerminology(ctx, annotationFrame.terminology, dimensions)
      }
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [annotationFrame, dimensions, showAnnotations])

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
      {/* Video Container with Canvas Overlay */}
      <div ref={videoContainerRef} className="relative flex-1">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          onClick={togglePlay}
        />

        {/* Canvas Annotation Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: showAnnotations ? 1 : 0 }}
          aria-hidden="true"
        />

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
