// Annotation data types for football play visualization

export interface PlayerAnnotation {
  id: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  label: string;
  highlight: boolean;
  color: string;
}

export interface ArrowAnnotation {
  from: [number, number]; // [x, y] percentages
  to: [number, number]; // [x, y] percentages
  color: string;
  label?: string;
  dashed?: boolean;
}

export interface TerminologyAnnotation {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  term: string;
  definition: string;
  duration: number; // seconds to display
}

export interface AnnotationFrame {
  timestamp: number;
  players: PlayerAnnotation[];
  arrows: ArrowAnnotation[];
  terminology: TerminologyAnnotation[];
}

export interface AnnotationData {
  metadata?: {
    videoWidth?: number;
    videoHeight?: number;
    frameRate?: number;
  };
  frames: AnnotationFrame[];
}

// Interpolated types for rendering
export interface InterpolatedPlayer extends PlayerAnnotation {
  opacity: number;
}

export interface InterpolatedArrow extends ArrowAnnotation {
  opacity: number;
}

export interface InterpolatedTerminology extends TerminologyAnnotation {
  opacity: number;
  startTime: number;
}

export interface InterpolatedFrame {
  players: InterpolatedPlayer[];
  arrows: InterpolatedArrow[];
  terminology: InterpolatedTerminology[];
}

// Canvas coordinate types
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

// Backend API response types
export interface BackendTerminology {
  x: number;
  y: number;
  term: string;
  definition: string;
}

export interface BackendFrame {
  timestamp: number;
  players: PlayerAnnotation[];
  arrows: ArrowAnnotation[];
  terminology: BackendTerminology[];
}

export interface BackendAnnotationResponse {
  video_duration: number;
  video_url: string;
  play_summary: string;
  frames: BackendFrame[];
}
