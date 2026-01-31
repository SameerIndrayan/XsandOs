import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnnotationFrame } from '../schema/contract';

/**
 * Gemini-powered Q&A service for football play analysis
 * Provides dynamic, context-aware responses based on video analysis
 */

export interface QAContext {
  playSummary: string;
  currentTimestamp: number;
  videoDuration: number;
  currentFrame?: AnnotationFrame;
  allFrames?: AnnotationFrame[];
}

export interface QAResponse {
  answer: string;
  confidence: number;
}

/**
 * Generate a dynamic response to a user's question about the football play
 * Uses Gemini to provide context-aware explanations
 */
export async function generateQAResponse(
  question: string,
  context: QAContext
): Promise<QAResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Build context for the prompt
  const timePercent = context.videoDuration > 0
    ? ((context.currentTimestamp / context.videoDuration) * 100).toFixed(0)
    : 0;

  // Describe current frame if available
  let frameDescription = '';
  if (context.currentFrame) {
    const { players, arrows, terminology } = context.currentFrame;

    if (players && players.length > 0) {
      const playerList = players.map(p =>
        `${p.label || p.id} at position (${p.x.toFixed(0)}%, ${p.y.toFixed(0)}%)${p.highlight ? ' [highlighted]' : ''}`
      ).join(', ');
      frameDescription += `\nVisible players: ${playerList}`;
    }

    if (arrows && arrows.length > 0) {
      const arrowList = arrows.map(a =>
        `${a.label || 'Movement'}: from (${a.from[0].toFixed(0)}%, ${a.from[1].toFixed(0)}%) to (${a.to[0].toFixed(0)}%, ${a.to[1].toFixed(0)}%)`
      ).join(', ');
      frameDescription += `\nMovement arrows: ${arrowList}`;
    }

    if (terminology && terminology.length > 0) {
      const termList = terminology.map(t => `${t.term}: ${t.definition}`).join(', ');
      frameDescription += `\nFootball terminology: ${termList}`;
    }
  }

  const systemPrompt = `You are an expert football analyst and coach helping viewers understand a football play. You're friendly, educational, and explain concepts clearly for both beginners and experienced fans.

PLAY CONTEXT:
- Play Summary: ${context.playSummary || 'A football play is in progress'}
- Current Time: ${context.currentTimestamp.toFixed(1)}s of ${context.videoDuration.toFixed(1)}s (${timePercent}% through the play)
${frameDescription}

PHASE OF PLAY (based on timing):
${context.currentTimestamp < 1 ? '- Pre-snap: Formation is set, players are lined up' : ''}
${context.currentTimestamp >= 1 && context.currentTimestamp < 2 ? '- Snap/Initial action: Ball has been snapped, play is starting' : ''}
${context.currentTimestamp >= 2 && context.currentTimestamp < 4 ? '- Play development: Routes are being run, blocking is happening' : ''}
${context.currentTimestamp >= 4 ? '- Play execution/conclusion: Pass/run is being completed' : ''}

GUIDELINES:
1. Answer the specific question asked
2. Reference what's visible at the current timestamp when relevant
3. Explain football terminology if the viewer might not know it
4. Keep responses concise (2-4 sentences) but informative
5. Be enthusiastic about good plays and educational about mistakes
6. If asked about something not visible, explain what typically happens

USER QUESTION: ${question}

Provide a helpful, conversational response:`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const answer = response.text().trim();

    return {
      answer,
      confidence: 0.9, // Could be enhanced with response metadata
    };
  } catch (error) {
    console.error('Gemini Q&A error:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Get the frame closest to the given timestamp
 */
export function getFrameAtTimestamp(
  frames: AnnotationFrame[],
  timestamp: number
): AnnotationFrame | undefined {
  if (!frames || frames.length === 0) return undefined;

  // Find the frame with the closest timestamp
  let closest = frames[0];
  let minDiff = Math.abs(frames[0].timestamp - timestamp);

  for (const frame of frames) {
    const diff = Math.abs(frame.timestamp - timestamp);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frame;
    }
  }

  return closest;
}
