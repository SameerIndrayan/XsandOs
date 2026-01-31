import { AnnotationFrame } from '../schema/contract';
import type { AnalyzeResponse } from '../schema/contract';
import { COLORS } from '../utils/hex';
import { clampPercent } from '../utils/percent';

/**
 * Mock service that generates deterministic annotations based on timestamp
 * Used when MOCK_MODE=1 or when Gemini fails
 */

const MOCK_VIDEO_DURATION = 12.5; // seconds

/**
 * Generates deterministic mock annotations for a given timestamp
 */
function generateMockFrame(timestamp: number): AnnotationFrame {
  // Use timestamp as seed for deterministic output
  const seed = Math.floor(timestamp * 10);
  const normalizedTime = timestamp / MOCK_VIDEO_DURATION; // 0-1

  // Generate players (deterministic based on timestamp)
  const players = [
    {
      id: 'player_1',
      x: clampPercent(20 + (seed % 30)),
      y: clampPercent(30 + (seed % 20)),
      label: 'QB',
      highlight: true,
      color: COLORS.PLAYER_HIGHLIGHT,
    },
    {
      id: 'player_2',
      x: clampPercent(60 + (seed % 25)),
      y: clampPercent(50 + (seed % 15)),
      label: 'WR',
      highlight: true,
      color: COLORS.PLAYER_HIGHLIGHT,
    },
    {
      id: 'player_3',
      x: clampPercent(80 + (seed % 15)),
      y: clampPercent(40 + (seed % 20)),
      label: 'CB',
      highlight: false,
      color: COLORS.PLAYER_NORMAL,
    },
  ];

  // Generate arrows (movement patterns)
  const arrows = [
    {
      from: [clampPercent(20 + (seed % 10)), clampPercent(30 + (seed % 10))] as [number, number],
      to: [clampPercent(60 + (seed % 10)), clampPercent(50 + (seed % 10))] as [number, number],
      color: COLORS.ARROW,
      label: 'Pass Route',
    },
  ];

  // Generate terminology annotations
  const terminology = [
    {
      x: clampPercent(50 + (seed % 20)),
      y: clampPercent(10 + (seed % 10)),
      term: normalizedTime < 0.5 ? 'Formation' : 'Route',
      definition: normalizedTime < 0.5 
        ? 'Offensive player alignment' 
        : 'Receiver running pattern',
    },
  ];

  return {
    timestamp,
    players,
    arrows,
    terminology,
  };
}

/**
 * Generates mock response with keyframes at regular intervals
 */
export function generateMockResponse(interval: number = 0.5): AnalyzeResponse {
  const frames: AnnotationFrame[] = [];
  
  // Generate frames at regular intervals
  for (let t = 0; t <= MOCK_VIDEO_DURATION; t += interval) {
    const timestamp = Math.round(t * 100) / 100; // Round to 2 decimals
    frames.push(generateMockFrame(timestamp));
  }

  return {
    video_duration: MOCK_VIDEO_DURATION,
    video_url: '', // Will be set by route handler
    play_summary: 'Mock play summary: Sample football play with offensive and defensive players demonstrating formation and route patterns.',
    frames,
  };
}
