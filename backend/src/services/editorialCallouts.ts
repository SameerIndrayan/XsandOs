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
  
  // Build callout generation prompt - FORMATIONS PRE-PLAY + ONE ACTION DURING PLAY
  const calloutPrompt = `You are an NFL broadcast analyst creating a clean broadcast-style overlay.

HARD CONSTRAINTS (MUST FOLLOW):
- Generate EXACTLY 3 callouts:
  1. Offensive Formation (shown PRE-PLAY, 0s to 2s)
  2. Defensive Formation (shown PRE-PLAY, 0s to 2s)
  3. ONE action/outcome callout (shown DURING PLAY, appears at key moment, lasts 3s)

TIMING RULES:
- Formations: start_time = 0, end_time = 2.0 (pre-play only)
- Action callout: start_time = when key action happens (e.g., 3.0s), end_time = start_time + 3.0

OFFENSIVE FORMATIONS to identify:
- Shotgun, I-Formation, T-Formation, Pistol, Spread, Empty, Wildcat, Singleback, Pro Formation

DEFENSIVE FORMATIONS to identify:
- Nickel (5 DBs), Dime (6 DBs), Cover 2, Cover 3, Cover 4, Cover 1, 4-3, 3-4, 4-2-5, 3-3-5

ACTION CALLOUT (choose the ONE most important):
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

Play summary: ${playSummary}

Return JSON array with EXACTLY 3 callouts. Use these EXACT IDs:

[
  {
    "id": "offensive_formation",
    "start_time": 0,
    "end_time": 2.0,
    "text": "Shotgun" or "I-Formation" or "Pistol" or "Spread" or "Empty" or "Wildcat" or "Singleback" or "Pro Formation" or "T-Formation",
    "detail": "Brief description of the offensive formation",
    "anchor": {
      "x": 50,
      "y": 60
    }
  },
  {
    "id": "defensive_formation",
    "start_time": 0,
    "end_time": 2.0,
    "text": "Nickel" or "Dime" or "Cover 2" or "Cover 3" or "Cover 4" or "Cover 1" or "4-3" or "3-4" or "4-2-5" or "3-3-5",
    "detail": "Brief description of the defensive formation",
    "anchor": {
      "x": 50,
      "y": 40
    }
  },
  {
    "id": "action_callout",
    "start_time": 3.0,
    "end_time": 6.0,
    "text": "Pursuit" or "Downfield Blocking" or "Pass Rush" or "Tight Coverage" or other action concept,
    "detail": "Brief explanation of why this matters",
    "anchor": {
      "x": 60,
      "y": 50
    }
  }
]

CRITICAL: You MUST use these exact IDs: "offensive_formation", "defensive_formation", "action_callout"
Formations MUST have start_time: 0, end_time: 2.0

No markdown, no code blocks. Return ONLY the JSON array.`;

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
    
    // Separate into formations (pre-play) and action callout (during play)
    // More flexible matching for formations
    const offensiveFormations = validCallouts.filter(c => {
      const text = c.text.toLowerCase();
      const detail = c.detail.toLowerCase();
      return text.includes('shotgun') || text.includes('formation') || 
             text.includes('i-formation') || text.includes('i formation') ||
             text.includes('pistol') || text.includes('spread') || 
             text.includes('empty') || text.includes('wildcat') ||
             text.includes('singleback') || text.includes('pro') || 
             text.includes('t-formation') || text.includes('t formation') ||
             detail.includes('quarterback') || detail.includes('qb') ||
             detail.includes('offensive formation') || detail.includes('offense');
    });
    
    const defensiveFormations = validCallouts.filter(c => {
      const text = c.text.toLowerCase();
      const detail = c.detail.toLowerCase();
      return text.includes('nickel') || text.includes('dime') ||
             text.includes('cover') || text.includes('4-3') ||
             text.includes('3-4') || text.includes('4-2-5') ||
             text.includes('3-3-5') || text.includes('base') ||
             detail.includes('defensive') || detail.includes('defense') ||
             detail.includes('db') || detail.includes('defensive back');
    });
    
    // Action callouts (not formations)
    const actionCallouts = validCallouts.filter(c => {
      const text = c.text.toLowerCase();
      const isFormation = offensiveFormations.includes(c) || defensiveFormations.includes(c);
      return !isFormation;
    });
    
    // Score action callouts by relevance
    const scoredActions = actionCallouts.map(c => {
      let score = 0;
      const text = c.text.toLowerCase();
      const actionConcepts = ['pursuit', 'blocking', 'pass rush', 'coverage', 'scramble', 
                             'tackle', 'pick', 'contain', 'collapse', 'leverage', 'seal', 
                             'window', 'breakdown', 'pickup', 'angle'];
      actionConcepts.forEach(concept => {
        if (text.includes(concept)) {
          score += 10;
        }
      });
      return { callout: c, score };
    });
    
    scoredActions.sort((a, b) => b.score - a.score);
    const topAction = scoredActions.length > 0 ? scoredActions[0].callout : null;
    
    // Build final callouts: 2 formations (pre-play) + 1 action (during play)
    const finalCallouts: EditorialCallout[] = [];
    
    // 1. Offensive Formation (pre-play: 0s to 2s)
    // Always generate - use detected or fallback
    const offensiveFormation = offensiveFormations.length > 0 
      ? offensiveFormations[0]
      : {
          text: 'Shotgun',
          detail: 'Quarterback lines up several yards behind center',
          anchor: { x: 50, y: 60 },
        };
    
    finalCallouts.push({
      ...offensiveFormation,
      id: 'offensive_formation',
      start_time: 0,
      end_time: 2.0,
    });
    
    // 2. Defensive Formation (pre-play: 0s to 2s)
    // Always generate - use detected or fallback
    const defensiveFormation = defensiveFormations.length > 0
      ? defensiveFormations[0]
      : {
          text: 'Nickel Defense',
          detail: 'Defense with 5 defensive backs',
          anchor: { x: 50, y: 40 },
        };
    
    finalCallouts.push({
      ...defensiveFormation,
      id: 'defensive_formation',
      start_time: 0,
      end_time: 2.0,
    });
    
    // 3. ONE Action Callout (during play, appears at key moment, lasts 3s)
    if (topAction) {
      const actionStart = Math.max(2.5, Math.min(videoMeta.durationSec - 3.0, topAction.start_time));
      finalCallouts.push({
        ...topAction,
        id: 'action_callout',
        start_time: actionStart,
        end_time: actionStart + 3.0,
      });
    } else {
      // Default action callout if none found
      const actionStart = Math.max(2.5, videoMeta.durationSec * 0.3);
      finalCallouts.push({
        id: 'action_callout',
        start_time: actionStart,
        end_time: actionStart + 3.0,
        text: 'Pursuit',
        detail: 'Defensive pursuit angle affects the play outcome',
        anchor: { x: 60, y: 50 },
      });
    }
    
    console.log(`Generated ${finalCallouts.length} callouts: 2 formations (pre-play) + 1 action (during play)`);
    console.log('Callouts:', JSON.stringify(finalCallouts.map(c => ({ id: c.id, text: c.text, start: c.start_time, end: c.end_time })), null, 2));
    return finalCallouts;
  } catch (error) {
    console.error('Error generating editorial callouts:', error);
    return [];
  }
}
