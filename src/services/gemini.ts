import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs/promises';
import { ExtractedFrame } from '../schema/annotation';
import { FrameData } from '../schema/annotation';

/**
 * Gemini Vision API service
 * Handles communication with Google's Gemini Vision API for frame analysis
 * 
 * Design decisions:
 * - Uses official @google/generative-ai SDK
 * - Supports mock mode for development without API calls
 * - Implements JSON repair for malformed responses
 * - Processes frames individually for better control
 */

interface GeminiConfig {
  apiKey: string;
  model: string;
  mockMode: boolean;
}

let config: GeminiConfig | null = null;

/**
 * Initialize Gemini service with configuration
 */
export function initGemini(apiKey: string, model: string, mockMode: boolean): void {
  config = { apiKey, model, mockMode };
}

/**
 * Converts image file to base64 for Gemini API
 */
async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Attempts to repair malformed JSON by extracting JSON from markdown or fixing common issues
 */
function repairJSON(jsonString: string): string {
  // Remove markdown code blocks if present
  let cleaned = jsonString.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Try to extract JSON object if wrapped in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return cleaned;
}

/**
 * System prompt for Gemini to ensure structured JSON output
 */
const SYSTEM_PROMPT = `You are analyzing a football video frame. Return ONLY valid JSON. No markdown, no explanations, no code blocks.

Analyze the frame and return a JSON object with this exact structure:
{
  "players": [
    {
      "id": "string (unique identifier)",
      "x": number (pixel x coordinate, 0-width),
      "y": number (pixel y coordinate, 0-height),
      "label": "string (player name or position)",
      "highlight": boolean (true if player is key to the play)
    }
  ],
  "annotations": [
    {
      "type": "arrow",
      "from": [x, y],
      "to": [x, y]
    },
    OR
    {
      "type": "textbox",
      "x": number,
      "y": number,
      "term": "string",
      "definition": "string"
    },
    OR
    {
      "type": "circle",
      "x": number,
      "y": number,
      "r": number (radius),
      "label": "string"
    }
  ]
}

Focus on:
- Key players involved in the play
- Movement patterns (arrows)
- Tactical concepts (textboxes with terms/definitions)
- Important zones (circles)

Return ONLY the JSON object, nothing else.`;

/**
 * Analyzes a single frame using Gemini Vision API
 */
async function analyzeFrameReal(frame: ExtractedFrame, promptContext?: string): Promise<FrameData> {
  if (!config) {
    throw new Error('Gemini service not initialized');
  }

  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.model });

  // Convert image to base64
  const imageBase64 = await imageToBase64(frame.path);
  const imageData = {
    inlineData: {
      data: imageBase64,
      mimeType: 'image/jpeg',
    },
  };

  // Build prompt
  const userPrompt = promptContext
    ? `${SYSTEM_PROMPT}\n\nContext: ${promptContext}`
    : SYSTEM_PROMPT;

  try {
    // Gemini SDK expects parts array with text and inline data
    const result = await model.generateContent([
      { text: userPrompt },
      imageData,
    ]);
    const response = await result.response;
    let text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    // Repair JSON if needed
    text = repairJSON(text);

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parse error. Raw response: ${text.substring(0, 500)}`);
      throw new Error(`Invalid JSON from Gemini: ${text.substring(0, 200)}`);
    }

    // Return frame data with timestamp
    return {
      timestamp: frame.timestamp,
      players: parsed.players || [],
      annotations: parsed.annotations || [],
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorDetails = error?.cause || error?.stack || '';
    console.error(`Gemini API error details:`, { errorMessage, errorDetails });
    throw new Error(`Gemini API error: ${errorMessage}`);
  }
}

/**
 * Generates mock frame data for testing
 */
function generateMockFrameData(timestamp: number): FrameData {
  // Deterministic mock data based on timestamp
  const seed = Math.floor(timestamp * 10);
  const mockPlayers = [
    {
      id: 'player_1',
      x: 100 + (seed % 200),
      y: 150 + (seed % 100),
      label: 'QB',
      highlight: true,
    },
    {
      id: 'player_2',
      x: 300 + (seed % 150),
      y: 200 + (seed % 80),
      label: 'WR',
      highlight: true,
    },
    {
      id: 'player_3',
      x: 500 + (seed % 100),
      y: 180 + (seed % 120),
      label: 'CB',
      highlight: false,
    },
  ];

  const mockAnnotations = [
    {
      type: 'arrow' as const,
      from: [100 + (seed % 100), 150 + (seed % 50)] as [number, number],
      to: [300 + (seed % 100), 200 + (seed % 50)] as [number, number],
    },
    {
      type: 'textbox' as const,
      x: 200 + (seed % 200),
      y: 100 + (seed % 100),
      term: 'Route',
      definition: 'Receiver running pattern',
    },
  ];

  return {
    timestamp,
    players: mockPlayers,
    annotations: mockAnnotations,
  };
}

/**
 * Analyzes frames using Gemini Vision API (or mock mode)
 * 
 * @param frames - Array of extracted frames with paths and timestamps
 * @param promptContext - Optional context string to guide analysis
 * @returns Array of frame data with players and annotations
 */
export async function analyzeFrames(
  frames: ExtractedFrame[],
  promptContext?: string
): Promise<FrameData[]> {
  if (!config) {
    throw new Error('Gemini service not initialized');
  }

  if (config.mockMode) {
    // Return mock data for all frames
    return frames.map((frame) => generateMockFrameData(frame.timestamp));
  }

  // Process frames sequentially to avoid rate limits
  // In production, you might want to batch or parallelize with rate limiting
  const results: FrameData[] = [];
  console.log(`Starting analysis of ${frames.length} frames with Gemini...`);
  
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    try {
      console.log(`Analyzing frame ${i + 1}/${frames.length} at ${frame.timestamp}s...`);
      const frameData = await analyzeFrameReal(frame, promptContext);
      console.log(`✅ Frame ${i + 1} analyzed: ${frameData.players.length} players, ${frameData.annotations.length} annotations`);
      results.push(frameData);
    } catch (error) {
      // Log error but continue with other frames
      console.error(`❌ Error analyzing frame at ${frame.timestamp}s:`, error);
      // Return empty frame data on error
      results.push({
        timestamp: frame.timestamp,
        players: [],
        annotations: [],
      });
    }
  }

  console.log(`Completed analysis: ${results.length} frames processed`);
  return results;
}
