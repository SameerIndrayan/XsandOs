import { z } from 'zod';

/**
 * Zod schemas and TypeScript types for annotation data structures
 * These define the contract for the API response and ensure type safety
 */

// Player detection schema
export const PlayerSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  label: z.string(),
  highlight: z.boolean(),
});

// Annotation types - union of all possible annotation shapes
export const ArrowAnnotationSchema = z.object({
  type: z.literal('arrow'),
  from: z.tuple([z.number(), z.number()]),
  to: z.tuple([z.number(), z.number()]),
});

export const TextboxAnnotationSchema = z.object({
  type: z.literal('textbox'),
  x: z.number(),
  y: z.number(),
  term: z.string(),
  definition: z.string(),
});

export const CircleAnnotationSchema = z.object({
  type: z.literal('circle'),
  x: z.number(),
  y: z.number(),
  r: z.number(),
  label: z.string(),
});

export const AnnotationSchema = z.discriminatedUnion('type', [
  ArrowAnnotationSchema,
  TextboxAnnotationSchema,
  CircleAnnotationSchema,
]);

// Frame data schema
export const FrameDataSchema = z.object({
  timestamp: z.number(),
  players: z.array(PlayerSchema),
  annotations: z.array(AnnotationSchema),
});

// Video metadata schema
export const VideoMetaSchema = z.object({
  durationSec: z.number(),
  fps: z.number(),
  width: z.number(),
  height: z.number(),
});

// Complete API response schema
export const AnnotationResponseSchema = z.object({
  videoMeta: VideoMetaSchema,
  frames: z.array(FrameDataSchema),
});

// TypeScript types inferred from schemas
export type Player = z.infer<typeof PlayerSchema>;
export type ArrowAnnotation = z.infer<typeof ArrowAnnotationSchema>;
export type TextboxAnnotation = z.infer<typeof TextboxAnnotationSchema>;
export type CircleAnnotation = z.infer<typeof CircleAnnotationSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type FrameData = z.infer<typeof FrameDataSchema>;
export type VideoMeta = z.infer<typeof VideoMetaSchema>;
export type AnnotationResponse = z.infer<typeof AnnotationResponseSchema>;

// Internal frame extraction result
export interface ExtractedFrame {
  path: string;
  timestamp: number;
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  meta: VideoMeta;
}
