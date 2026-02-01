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
import { InterpolatedFrame, CanvasDimensions } from '../types/annotations'

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

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState("1")
  const [isDragging, setIsDragging] = useState(false)
  const [dimensions, setDimensions] = useState<CanvasDimensions>({
    width: 800,
    height: 450,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })

  // Calculate canvas dimensions when container or video changes
  useEffect(() => {
    const updateDimensions = () => {
      const container = videoContainerRef.current
      const canvas = canvasRef.current
      if (!container || !canvas) return

      const rect = container.getBoundingClientRect()
      const containerWidth = rect.width
      const containerHeight = rect.height

      // Use 16:9 aspect ratio as default, or actual video dimensions if available
      const video = videoRef.current
      const videoWidth = video?.videoWidth || 1920
      const videoHeight = video?.videoHeight || 1080

      // Calculate dimensions with letterbox/pillarbox
      const containerAspect = containerWidth / containerHeight
      const videoAspect = videoWidth / videoHeight

      let renderWidth: number
      let renderHeight: number
      let offsetX = 0
      let offsetY = 0

      if (containerAspect > videoAspect) {
        // Container is wider - pillarbox
        renderHeight = containerHeight
        renderWidth = renderHeight * videoAspect
        offsetX = (containerWidth - renderWidth) / 2
      } else {
        // Container is taller - letterbox
        renderWidth = containerWidth
        renderHeight = renderWidth / videoAspect
        offsetY = (containerHeight - renderHeight) / 2
      }

      // Set canvas size (account for device pixel ratio)
      const dpr = window.devicePixelRatio || 1
      canvas.width = containerWidth * dpr
      canvas.height = containerHeight * dpr
      canvas.style.width = `${containerWidth}px`
      canvas.style.height = `${containerHeight}px`

      // Scale context for HiDPI
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }

      setDimensions({
        width: renderWidth,
        height: renderHeight,
        offsetX,
        offsetY,
        scale: renderWidth / videoWidth,
      })
    }

    // Initial update
    updateDimensions()

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (videoContainerRef.current) {
      resizeObserver.observe(videoContainerRef.current)
    }

    // Update when video metadata loads
    const video = videoRef.current
    if (video) {
      video.addEventListener('loadedmetadata', updateDimensions)
    }

    return () => {
      resizeObserver.disconnect()
      if (video) {
        video.removeEventListener('loadedmetadata', updateDimensions)
      }
    }
  }, [videoUrl])

  // Render annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

    // Only render if we have annotation data and annotations are visible
    if (!showAnnotations || !annotationFrame) return
    if (dimensions.width <= 0 || dimensions.height <= 0) return

    const animationTime = Date.now()

    // Helper to convert normalized coords (0-100) to canvas coords
    const toCanvas = (x: number, y: number) => ({
      x: dimensions.offsetX + (x / 100) * dimensions.width,
      y: dimensions.offsetY + (y / 100) * dimensions.height,
    })

    // Render arrows first (below players)
    for (const arrow of annotationFrame.arrows) {
      if (arrow.opacity <= 0) continue

      const from = toCanvas(arrow.from[0], arrow.from[1])
      const to = toCanvas(arrow.to[0], arrow.to[1])

      ctx.save()
      ctx.globalAlpha = Math.max(0.5, arrow.opacity) // Minimum 50% opacity

      // Line width based on canvas size
      const lineWidth = Math.max(4, dimensions.width * 0.005)
      const arrowHeadSize = Math.max(15, dimensions.width * 0.02)

      // Calculate angle for arrowhead
      const angle = Math.atan2(to.y - from.y, to.x - from.x)

      // Draw line with glow
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.strokeStyle = arrow.color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.shadowColor = arrow.color
      ctx.shadowBlur = 12

      if (arrow.dashed) {
        ctx.setLineDash([15, 8])
      }

      ctx.stroke()
      ctx.setLineDash([])

      // Draw arrowhead
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - arrowHeadSize * Math.cos(angle - Math.PI / 6),
        to.y - arrowHeadSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        to.x - arrowHeadSize * Math.cos(angle + Math.PI / 6),
        to.y - arrowHeadSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fillStyle = arrow.color
      ctx.fill()

      // Draw label if present
      if (arrow.label) {
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        const fontSize = Math.max(12, dimensions.width * 0.014)

        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`

        const textWidth = ctx.measureText(arrow.label).width
        const padding = 6
        const pillHeight = fontSize + padding * 2
        const pillWidth = textWidth + padding * 3

        // Background pill
        ctx.beginPath()
        ctx.roundRect(
          midX - pillWidth / 2,
          midY - pillHeight / 2,
          pillWidth,
          pillHeight,
          pillHeight / 2
        )
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
        ctx.fill()
        ctx.strokeStyle = arrow.color + '80'
        ctx.lineWidth = 2
        ctx.stroke()

        // Text
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(arrow.label, midX, midY)
      }

      ctx.restore()
    }

    // Render players as elliptical highlights
    for (const player of annotationFrame.players) {
      if (player.opacity <= 0) continue

      const pos = toCanvas(player.x, player.y)

      // Ellipse size - wider than tall for ground perspective
      const ellipseWidth = Math.max(45, dimensions.width * 0.055)
      const ellipseHeight = ellipseWidth * 0.4
      const strokeWidth = Math.max(3, dimensions.width * 0.004)

      ctx.save()
      ctx.globalAlpha = Math.max(0.6, player.opacity) // Minimum 60% opacity

      // Position ellipse at player's feet
      const ellipseY = pos.y + ellipseHeight * 0.3

      // Glow effect for highlighted players
      if (player.highlight) {
        const pulse = Math.sin(animationTime / 250) * 0.15 + 0.85

        ctx.beginPath()
        ctx.ellipse(pos.x, ellipseY, ellipseWidth + 10, (ellipseHeight + 6) * pulse, 0, 0, Math.PI * 2)
        ctx.fillStyle = player.color + '40'
        ctx.fill()
      }

      // Main ellipse with gradient fill
      ctx.beginPath()
      ctx.ellipse(pos.x, ellipseY, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2)

      const gradient = ctx.createRadialGradient(
        pos.x, ellipseY, 0,
        pos.x, ellipseY, ellipseWidth
      )
      gradient.addColorStop(0, player.color + '60')
      gradient.addColorStop(0.6, player.color + '40')
      gradient.addColorStop(1, player.color + '20')

      ctx.fillStyle = gradient
      ctx.fill()

      // Solid stroke ring
      ctx.strokeStyle = player.color
      ctx.lineWidth = strokeWidth
      ctx.stroke()

      // Player label above ellipse
      if (player.label) {
        const labelFontSize = Math.max(11, dimensions.width * 0.013)
        ctx.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        // Label background
        const labelWidth = ctx.measureText(player.label).width + 10
        const labelHeight = labelFontSize + 6
        const labelY = pos.y - ellipseHeight - 8

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
        ctx.beginPath()
        ctx.roundRect(pos.x - labelWidth / 2, labelY - labelHeight, labelWidth, labelHeight, 4)
        ctx.fill()

        ctx.fillStyle = player.color
        ctx.fillText(player.label, pos.x, labelY - 3)
      }

      ctx.restore()
    }

    // Render terminology boxes
    for (const term of annotationFrame.terminology) {
      if (term.opacity <= 0) continue

      const pos = toCanvas(term.x, term.y)

      ctx.save()
      ctx.globalAlpha = Math.max(0.7, term.opacity)

      const titleFontSize = Math.max(14, dimensions.width * 0.018)
      const defFontSize = Math.max(12, dimensions.width * 0.014)
      const padding = Math.max(16, dimensions.width * 0.02)
      const maxWidth = Math.min(300, dimensions.width * 0.3)

      // Measure text
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`
      const titleWidth = ctx.measureText(term.term).width

      ctx.font = `${defFontSize}px Inter, system-ui, sans-serif`

      // Word wrap definition
      const words = term.definition.split(' ')
      const lines: string[] = []
      let currentLine = ''
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (ctx.measureText(testLine).width > maxWidth - padding * 2 && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
      if (currentLine) lines.push(currentLine)

      const lineHeight = defFontSize * 1.5
      const boxWidth = Math.max(titleWidth + padding * 2, maxWidth * 0.8)
      const boxHeight = titleFontSize + lines.length * lineHeight + padding * 2.5

      // Box with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 8

      const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x, pos.y + boxHeight)
      gradient.addColorStop(0, 'rgba(30, 41, 59, 0.95)')
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.98)')

      ctx.beginPath()
      ctx.roundRect(pos.x, pos.y, boxWidth, boxHeight, 10)
      ctx.fillStyle = gradient
      ctx.fill()

      // Border
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Accent bar
      ctx.beginPath()
      ctx.roundRect(pos.x, pos.y, 4, boxHeight, [10, 0, 0, 10])
      ctx.fillStyle = '#6366f1'
      ctx.fill()

      // Title
      ctx.font = `bold ${titleFontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = '#a5b4fc'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(term.term, pos.x + padding + 4, pos.y + padding)

      // Definition lines
      ctx.font = `${defFontSize}px Inter, system-ui, sans-serif`
      ctx.fillStyle = '#e2e8f0'
      let yOffset = pos.y + padding + titleFontSize + 10
      for (const line of lines) {
        ctx.fillText(line, pos.x + padding + 4, yOffset)
        yOffset += lineHeight
      }

      ctx.restore()
    }
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
