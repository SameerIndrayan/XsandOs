import { z } from 'zod';

/**
 * Zod schemas and TypeScript types for the Football Annotation API contract
 * All coordinates are percentage-based (0-100)
 * 
 * CURRENT ISSUES (to be addressed by VisionAgents integration):
 * 1) We are not producing temporally consistent player IDs across frames (players pop in/out).
 * 2) We are not reliably producing BOTH offense and defense players; we want "whole defensive play".
 * 3) We do not return a stable video_url for the frontend to play the real video with canvas overlay.
 * 4) Gemini integration is incomplete and output is not schema-safe.
 */

// Player annotation schema
export const PlayerAnnotationSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100), // percentage 0-100
  y: z.number().min(0).max(100), // percentage 0-100
  label: z.string(),
  highlight: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
});

// Arrow annotation schema
export const ArrowAnnotationSchema = z.object({
  from: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  to: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  label: z.string().optional(),
});

// Terminology annotation schema (legacy, kept for backward compatibility)
export const TerminologyAnnotationSchema = z.object({
  x: z.number().min(0).max(100), // percentage 0-100
  y: z.number().min(0).max(100), // percentage 0-100
  term: z.string(),
  definition: z.string(),
});

// Editorial callout schema (time-based, not frame-based)
// Broadcast-style: action/outcome concepts that explain play success/failure
export const EditorialCalloutSchema = z.object({
  id: z.string(), // Unique identifier for this callout
  start_time: z.number().nonnegative(), // Start time in seconds
  end_time: z.number().nonnegative(), // End time in seconds (must be >= start_time + 3.0)
  text: z.string().min(1).max(50), // Short label, 1-3 words (e.g., "Pursuit", "Downfield Blocking")
  detail: z.string().min(1).max(200), // 1 sentence max explaining why this matters to play outcome
  anchor: z.object({
    x: z.number().min(0).max(100), // percentage 0-100, where the action occurs
    y: z.number().min(0).max(100), // percentage 0-100
    player_id: z.string().optional(), // Optional trackable player/object id
  }),
  // Optional: visual elements tied to this callout (max 1 circle OR 1 arrow per callout)
  circle: z.object({
    player_id: z.string(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }).optional(),
  arrow: z.object({
    from: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
    to: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]),
  }).optional(),
}).refine(
  (data) => data.end_time >= data.start_time + 3.0,
  {
    message: "end_time must be at least 3.0 seconds after start_time",
    path: ["end_time"],
  }
).refine(
  (data) => !(data.circle && data.arrow), // Not both circle and arrow
  {
    message: "Cannot have both circle and arrow for a single callout",
  }
);

// Annotation frame schema
export const AnnotationFrameSchema = z.object({
  timestamp: z.number().nonnegative(),
  players: z.array(PlayerAnnotationSchema),
  arrows: z.array(ArrowAnnotationSchema),
  terminology: z.array(TerminologyAnnotationSchema),
});

// Error schema (optional, only if Gemini fails)
export const ErrorSchema = z.object({
  message: z.string(),
  details: z.any().optional(),
});

// Main response schema
export const AnalyzeResponseSchema = z.object({
  video_duration: z.number().nonnegative(),
  video_url: z.string().url(), // URL to the uploaded video for frontend playback
  play_summary: z.string(), // 2-3 sentence summary of the play
  frames: z.array(AnnotationFrameSchema),
  callouts: z.array(EditorialCalloutSchema).min(0).max(3), // Editorial callouts: 0-3 total for entire play
  error: ErrorSchema.optional(),
});

// Request schema for JSON body
export const AnalyzeRequestSchema = z.object({
  video_url: z.string().url().optional(),
});

// TypeScript types inferred from schemas
export type PlayerAnnotation = z.infer<typeof PlayerAnnotationSchema>;
export type ArrowAnnotation = z.infer<typeof ArrowAnnotationSchema>;
export type TerminologyAnnotation = z.infer<typeof TerminologyAnnotationSchema>;
export type EditorialCallout = z.infer<typeof EditorialCalloutSchema>;
export type AnnotationFrame = z.infer<typeof AnnotationFrameSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
