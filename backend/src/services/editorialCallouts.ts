import { ExtractedFrame, VideoMeta } from './frames';
import { AnnotationFrame, EditorialCallout } from '../schema/contract';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';

/**
 * Editorial Callout Generation Service
 * 
 * Generates time-based, editorial callouts (not frame-based).
 * Hard constraints:
 * - Maximum 3 callouts for entire play
 * - Each callout persists >= 3.0 seconds
 * - Only explains play outcome or key decision/mismatch
 * - Prioritizes: ball events, decisive defensive concepts, decisive blocking/routes
 */

interface KeyEvent {
  timestamp: number;
  type: 'snap' | 'dropback' | 'throw' | 'catch' | 'tackle' | 'scramble' | 'block' | 'defender_closing';
  frameIndex: number;
  description: string;
}

interface CalloutCandidate {
  start_time: number;
  end_time: number;
  text: string;
  detail: string;
  anchor: { x: number; y: number; player_id?: string };
  score: number;
  eventType: string;
}

/**
 * Analyze frames to identify key events
 */
async function identifyKeyEvents(
  frames: ExtractedFrame[],
  videoMeta: VideoMeta,
  model: any
): Promise<KeyEvent[]> {
  const events: KeyEvent[] = [];
  
  // Select key frames for event detection (first, middle, last, and every 2 seconds)
  const keyFrameIndices = new Set<number>();
  keyFrameIndices.add(0);
  keyFrameIndices.add(Math.floor(frames.length / 2));
  keyFrameIndices.add(frames.length - 1);
  
  // Add frames every 2 seconds
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].timestamp % 2 < 0.5 || frames[i].timestamp % 2 > 1.5) {
      keyFrameIndices.add(i);
    }
  }
  
  const fs = await import('fs/promises');
  const eventPrompt = `Analyze this football play frame and identify key events. Look for:
- Snap (ball being snapped)
- Dropback (QB moving back)
- Throw (ball being thrown)
- Catch (receiver catching)
- Tackle (player being tackled)
- Scramble (QB running)
- Block (key blocking moment)
- Defender closing (defender closing in on ball carrier)

Return JSON:
{
  "events": [
    {
      "type": "snap|dropback|throw|catch|tackle|scramble|block|defender_closing",
      "confidence": 0.0-1.0,
      "description": "brief description"
    }
  ]
}

Return ONLY valid JSON, no markdown.`;

  // Analyze key frames for events
  for (const frameIdx of Array.from(keyFrameIndices).sort((a, b) => a - b)) {
    if (frameIdx >= frames.length) continue;
    
    const frame = frames[frameIdx];
    try {
      const imageBuffer = await fs.readFile(frame.path);
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };
      
      const result = await model.generateContent([{ text: eventPrompt }, imagePart]);
      const response = await result.response;
      let text = response.text();
      
      // Clean JSON
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      
      const parsed = JSON.parse(text);
      if (parsed.events && Array.isArray(parsed.events)) {
        for (const event of parsed.events) {
          if (event.confidence > 0.5) { // Only high-confidence events
            events.push({
              timestamp: frame.timestamp,
              type: event.type,
              frameIndex: frameIdx,
              description: event.description || event.type,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing frame ${frameIdx} for events:`, error);
    }
  }
  
  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Generate editorial callouts from key events and frame analysis
 */
export async function generateEditorialCallouts(
  frames: ExtractedFrame[],
  annotatedFrames: AnnotationFrame[],
  videoMeta: VideoMeta,
  playSummary: string
): Promise<EditorialCallout[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VISIONAGENTS_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not configured, skipping editorial callout generation');
    return [];
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  
  console.log('Generating editorial callouts (max 3, >= 3s each)...');
  
  // Identify key events
  const keyEvents = await identifyKeyEvents(frames, videoMeta, model);
  console.log(`Identified ${keyEvents.length} key events`);
  
  // Build callout generation prompt - BROADCAST STYLE: Action/outcome concepts only
  const calloutPrompt = `You are an NFL broadcast analyst creating a clean broadcast-style overlay. Your goal is to explain WHY the play succeeded or failed, not to create a training diagram.

HARD CONSTRAINTS (MUST FOLLOW):
- MAX 3 callout boxes TOTAL for the entire clip
- Each callout must remain visible for at least 3.0 seconds once shown
- Do NOT rotate/replace callouts rapidly. No callout should appear for < 3s
- Only show callouts that are truly play-defining (top 3 most relevant concepts)
- If unsure, show FEWER than 3, not more

AVOID basic/obvious terms unless they are the CORE of why the play worked/failed:
- Avoid: "Line of Scrimmage", "Shotgun", "Center", "Route", "Formation", "Nickel Defense"
- Only use these if they are THE reason the play succeeded/failed

PREFER action/outcome concepts that explain the play:
- "Pursuit" - defensive pursuit angle that made the difference
- "Downfield Blocking" - blocking that created/removed space
- "Pass Rush" - pressure that affected the play
- "Tight Coverage" - coverage that prevented completion
- "Scramble Lane" - running lane that opened/closed
- "Missed Tackle" - tackle attempt that failed
- "Pick Concept" - route combination that worked
- "Contain" - edge contain that worked/failed
- "Pocket Collapse" - protection breakdown
- "Leverage" - coverage leverage that mattered
- "Pursuit Angle" - angle that cut off the play
- "Seal Block" - block that sealed the edge
- "Route Window" - window that opened/closed
- "Coverage Breakdown" - coverage that failed
- "Blitz Pickup" - protection that worked/failed

Play summary: ${playSummary}

SELECTION LOGIC:
- Score each potential callout by "play relevance": explains outcome + visible on film + non-redundant
- Pick the TOP 3 most relevant (or fewer if you can't justify 3)
- Each callout should explain a distinct aspect of why the play worked/failed

Return JSON array with 1-3 callouts (prefer fewer if unsure):
[
  {
    "id": "callout_1",
    "start_time": number (seconds, >= 0),
    "end_time": number (seconds, >= start_time + 3.0),
    "text": "string (1-3 words, e.g., 'Pursuit', 'Downfield Blocking', 'Cover 3 Man')",
    "detail": "string (1 sentence max explaining why this matters)",
    "anchor": {
      "x": number (0-100, percentage),
      "y": number (0-100, percentage),
      "player_id": "string (optional, e.g., 'qb1', 'wr1')"
    }
  }
]

Each callout must have:
- id: unique identifier (e.g., "callout_1")
- start_time: when to show (seconds, >= 0)
- end_time: when to hide (seconds, >= start_time + 3.0, <= ${videoMeta.durationSec.toFixed(1)})
- text: Short label (1-3 words, e.g., "Pursuit", "Downfield Blocking", "Pass Rush")
- detail: One sentence max explaining why this matters to the play outcome
- anchor: Position on field (x: 0-100, y: 0-100) where the action occurs
- optional: player_id if tied to a specific player

TIMING RULES:
- Stagger callouts so they don't all appear at once
- Each callout must be visible for >= 3.0 seconds
- If multiple callouts, space them out (e.g., first at 1s, second at 5s, third at 9s)
- End times should not exceed video duration

Return ONLY valid JSON array with 1-3 callouts, no markdown, no code blocks.`;

  try {
    // Use key frames (first, middle, last) for callout generation
    const keyFrameIndices = [
      0,
      Math.floor(frames.length / 2),
      frames.length - 1,
    ].filter(idx => idx < frames.length && idx >= 0);
    
    const fs = await import('fs/promises');
    const imageParts = await Promise.all(
      keyFrameIndices.map(async (idx) => {
        const imageBuffer = await fs.readFile(frames[idx].path);
        return {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
          },
        };
      })
    );
    
    const parts = [{ text: calloutPrompt }, ...imageParts];
    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text();
    
    // Clean JSON
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      text = jsonMatch[0];
    }
    
    const callouts = JSON.parse(text);
    
    // Validate and normalize callouts
    const validCallouts: EditorialCallout[] = [];
    for (const callout of Array.isArray(callouts) ? callouts : []) {
      if (
        callout.id &&
        typeof callout.start_time === 'number' &&
        typeof callout.end_time === 'number' &&
        callout.end_time >= callout.start_time + 3.0 &&
        callout.text &&
        callout.detail &&
        callout.anchor &&
        typeof callout.anchor.x === 'number' &&
        typeof callout.anchor.y === 'number' &&
        callout.start_time >= 0 &&
        callout.end_time <= videoMeta.durationSec
      ) {
        validCallouts.push({
          id: String(callout.id),
          start_time: Math.max(0, callout.start_time),
          end_time: Math.min(videoMeta.durationSec, callout.end_time),
          text: String(callout.text).substring(0, 50),
          detail: String(callout.detail).substring(0, 200),
          anchor: {
            x: Math.max(0, Math.min(100, callout.anchor.x)),
            y: Math.max(0, Math.min(100, callout.anchor.y)),
            player_id: callout.anchor.player_id ? String(callout.anchor.player_id) : undefined,
          },
        });
      }
    }
    
    // Filter out basic/obvious terms unless they're truly play-defining
    const filteredCallouts = validCallouts.filter(c => {
      const text = c.text.toLowerCase();
      const detail = c.detail.toLowerCase();
      
      // Filter out basic terms unless they're the core reason
      const basicTerms = ['line of scrimmage', 'shotgun', 'center', 'route', 'formation', 
                         'nickel defense', 'dime defense', 'base defense'];
      
      const isBasicTerm = basicTerms.some(term => text.includes(term) || detail.includes(term));
      
      // Only keep basic terms if they're explicitly about play outcome
      if (isBasicTerm) {
        const outcomeKeywords = ['failed', 'succeeded', 'worked', 'broke down', 'prevented', 
                                'allowed', 'created', 'removed', 'why', 'because', 'reason'];
        const hasOutcomeContext = outcomeKeywords.some(keyword => detail.includes(keyword));
        return hasOutcomeContext;
      }
      
      return true;
    });
    
    // Score callouts by play relevance
    const scoredCallouts = filteredCallouts.map(c => {
      let score = 0;
      const text = c.text.toLowerCase();
      const detail = c.detail.toLowerCase();
      
      // Action/outcome concepts get higher scores
      const actionConcepts = ['pursuit', 'blocking', 'pass rush', 'coverage', 'scramble', 
                             'tackle', 'pick', 'contain', 'collapse', 'leverage', 'seal', 
                             'window', 'breakdown', 'pickup', 'angle'];
      actionConcepts.forEach(concept => {
        if (text.includes(concept) || detail.includes(concept)) {
          score += 10;
        }
      });
      
      // Outcome-related keywords boost score
      const outcomeKeywords = ['failed', 'succeeded', 'prevented', 'allowed', 'created', 
                               'removed', 'cut off', 'opened', 'closed'];
      outcomeKeywords.forEach(keyword => {
        if (detail.includes(keyword)) {
          score += 5;
        }
      });
      
      // Penalize basic terms
      const basicTerms = ['line of scrimmage', 'shotgun', 'center', 'route', 'formation'];
      basicTerms.forEach(term => {
        if (text.includes(term)) {
          score -= 5;
        }
      });
      
      return { callout: c, score };
    });
    
    // Sort by score and take top 3 (or fewer)
    scoredCallouts.sort((a, b) => b.score - a.score);
    const topCallouts = scoredCallouts.slice(0, 3).map(sc => sc.callout);
    
    // Ensure timing constraints: each >= 3s, staggered, no overlaps
    const finalCallouts: EditorialCallout[] = [];
    let nextStartTime = 1.0; // Start first callout at 1s
    
    for (const callout of topCallouts) {
      const duration = Math.max(3.0, callout.end_time - callout.start_time);
      const startTime = Math.max(nextStartTime, callout.start_time);
      const endTime = Math.min(videoMeta.durationSec, startTime + duration);
      
      // Ensure minimum 3s duration
      if (endTime >= startTime + 3.0 && endTime <= videoMeta.durationSec) {
        finalCallouts.push({
          ...callout,
          start_time: startTime,
          end_time: endTime,
        });
        
        // Stagger next callout to start after this one (with gap)
        nextStartTime = endTime + 1.0;
      }
    }
    
    console.log(`Generated ${finalCallouts.length} broadcast-style callouts (max 3, each >= 3s)`);
    return finalCallouts;
  } catch (error) {
    console.error('Error generating editorial callouts:', error);
    return [];
  }
}
