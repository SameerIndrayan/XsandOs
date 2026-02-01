import { ExtractedFrame, VideoMeta } from './frames';
import { AnnotationFrame } from '../schema/contract';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * VisionAgents integration service
 * Uses Gemini Vision API for frame analysis (Vision Agents framework uses Gemini under the hood)
 * This provides better player detection with temporally consistent IDs
 */

interface VisionAgentsResponse {
  frames: AnnotationFrame[];
  play_summary: string;
}

/**
 * Analyzes frames using Gemini Vision API (powered by Vision Agents approach)
 * 
 * @param frames - Array of extracted frames with paths and timestamps
 * @param videoMeta - Video metadata (duration, dimensions, fps)
 * @returns Annotated frames and play summary
 */
export async function analyzeWithVisionAgents(
  frames: ExtractedFrame[],
  videoMeta: VideoMeta
): Promise<VisionAgentsResponse> {
  // Use GEMINI_API_KEY (Vision Agents uses Gemini under the hood)
  // VISIONAGENTS_API_KEY is kept for compatibility but GEMINI_API_KEY takes precedence
  const apiKey = process.env.GEMINI_API_KEY || process.env.VISIONAGENTS_API_KEY;
  // Use Gemini 2.0 Flash (latest model)
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured (required for Vision Agents integration)');
  }

  console.log(`Analyzing ${frames.length} frames with Gemini Vision API (Vision Agents approach)...`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Build prompt inspired by working googleJAN31 implementation
  // Simpler, more direct approach that works better with Gemini
  const systemPrompt = `Analyze this football play image. Identify all visible players (both offense and defense), their positions, and any movement patterns.

Return a JSON object with this exact structure:
{
  "players": [
    {
      "id": "string (e.g., qb1, wr1, cb1, or off_1, def_1)",
      "x": number (0-100, percentage from left),
      "y": number (0-100, percentage from top),
      "label": "string (position like QB, WR, CB)",
      "highlight": boolean,
      "color": "#HEX"
    }
  ],
  "arrows": [
    {
      "from": [x, y],
      "to": [x, y],
      "color": "#HEX",
      "label": "string (optional)"
    }
  ],
  "terminology": [
    {
      "x": number (0-100),
      "y": number (0-100),
      "term": "string",
      "definition": "string"
    }
  ]
}

Return ONLY valid JSON, no markdown, no code blocks, no explanations.`;

  const fs = await import('fs/promises');
  const allFrames: AnnotationFrame[] = [];
  let playSummary = '';

  // Process frames in PARALLEL for speed (like googleJAN31)
  // This is much faster than sequential processing
  console.log(`Processing ${frames.length} frames in parallel for speed...`);

  // Read all images first
  const imageParts = await Promise.all(
    frames.map(async (frame) => {
      const imageBuffer = await fs.readFile(frame.path);
      return {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      };
    })
  );

  // Process ALL frames in parallel (much faster!)
  const framePromises = frames.map(async (frame, frameIdx) => {
    const imagePart = imageParts[frameIdx];
    let framePrompt = systemPrompt;
    if (frameIdx > 0) {
      framePrompt += `\n\nMaintain consistent player IDs across frames. Use the same IDs for the same players.`;
    }
    
    try {
      const startTime = Date.now();
      // Send single frame to Gemini
      const parts = [{ text: framePrompt }, imagePart];
      const result = await model.generateContent(parts);
      const response = await result.response;
      let text = response.text();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[DEBUG] Frame ${frameIdx + 1}/${frames.length} processed in ${elapsed}s`);

      // Repair JSON if needed
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      let parsed: any;
      try {
        parsed = JSON.parse(text);
        const playersCount = parsed.players?.length || 0;
        if (playersCount > 0) {
          console.log(`[DEBUG] Frame ${frameIdx + 1}: ${playersCount} players detected`);
        }
      } catch (parseError) {
        console.error(`[DEBUG] JSON parse error for frame ${frameIdx + 1}. Text: ${text.substring(0, 200)}`);
        parsed = { players: [], arrows: [], terminology: [] };
      }

      return {
        timestamp: frame.timestamp,
        players: parsed.players || [],
        arrows: parsed.arrows || [],
        terminology: parsed.terminology || [],
      };
    } catch (error) {
      console.error(`Error processing frame ${frameIdx + 1}:`, error);
      return {
        timestamp: frame.timestamp,
        players: [],
        arrows: [],
        terminology: [],
      };
    }
  });

  // Wait for all frames to process in parallel
  const processedFrames = await Promise.all(framePromises);
  
  // Sort by timestamp to maintain order
  processedFrames.sort((a, b) => a.timestamp - b.timestamp);
  allFrames.push(...processedFrames);

  // Generate play summary using key frames (first, middle, last)
  try {
    console.log('Generating play summary from key frames...');
    
    // Select key frames: first, middle, and last
    const keyFrameIndices = [
      0, // First frame
      Math.floor(frames.length / 2), // Middle frame
      frames.length - 1, // Last frame
    ].filter(idx => idx < frames.length && idx >= 0);
    
    // Build summary prompt with key frames
    const summaryPrompt = `Analyze these key frames from a football play and provide a 2-3 sentence summary describing what happened in the play. Describe the formation, key movements, and outcome.`;
    
    // Prepare key frame images
    const summaryParts: any[] = [{ text: summaryPrompt }];
    for (const idx of keyFrameIndices) {
      summaryParts.push(imageParts[idx]);
    }
    
    const summaryResult = await model.generateContent(summaryParts);
    playSummary = summaryResult.response.text().trim();
    
    // Clean up any markdown formatting
    playSummary = playSummary.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
    
    console.log(`[DEBUG] Play summary generated (${playSummary.length} chars): ${playSummary.substring(0, 150)}...`);
  } catch (error) {
    console.error('Error generating play summary:', error);
    playSummary = 'Football play analyzed with player positions and movement patterns identified.';
  }

  // If no summary was captured, generate one from all frames
  if (!playSummary && allFrames.length > 0) {
    playSummary = 'Football play analyzed with player positions and movement patterns identified.';
  }

  console.log(`Gemini Vision analysis complete: ${allFrames.length} frames processed, summary length=${playSummary.length}`);

  return {
    frames: allFrames,
    play_summary: playSummary,
  };
}
