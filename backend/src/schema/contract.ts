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

// Terminology annotation schema
export const TerminologyAnnotationSchema = z.object({
  x: z.number().min(0).max(100), // percentage 0-100
  y: z.number().min(0).max(100), // percentage 0-100
  term: z.string(),
  definition: z.string(),
});

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
export type AnnotationFrame = z.infer<typeof AnnotationFrameSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
