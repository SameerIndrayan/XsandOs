/**
 * Eleven Labs API integration for high-quality text-to-speech
 * Provides natural-sounding voice synthesis
 */

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TTSResult {
  audioBuffer: Buffer;
  contentType: string;
}

// Popular Eleven Labs voice IDs
export const VOICES = {
  // Male voices
  ADAM: '21m00Tcm4TlvDq8ikWAM',      // American, deep, narration
  ANTONI: 'ErXwobaYiN019PkySvjV',    // American, well-rounded
  ARNOLD: 'VR6AewLTigWG4xSOukaG',    // American, crisp
  JOSH: 'TxGEqnHWrfWFTfGW9XjX',      // American, deep, young
  SAM: 'yoZ06aMxZJJ28mfd3POQ',       // American, raspy, young

  // Female voices
  BELLA: 'EXAVITQu4vr4xnSDxMaL',     // American, soft
  ELLI: 'MF3mGyEYCl7XYWbV9V6O',      // American, emotional
  RACHEL: '21m00Tcm4TlvDq8ikWAM',    // American, calm
};

// Default voice for football commentary (energetic male voice)
const DEFAULT_VOICE_ID = VOICES.JOSH;
const DEFAULT_MODEL_ID = 'eleven_turbo_v2_5'; // Fast, high-quality model

/**
 * Generate speech audio from text using Eleven Labs API
 *
 * @param text - Text to convert to speech
 * @param options - Voice and generation options
 * @returns Audio buffer in MP3 format
 */
export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = options.modelId || process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  const requestBody = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0.5,
      use_speaker_boost: options.useSpeakerBoost ?? true,
    },
  };

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error:', response.status, errorText);
      throw new Error(`Eleven Labs API error: ${response.status}`);
    }

    // Get audio as ArrayBuffer and convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('Eleven Labs TTS error:', error);
    throw new Error('Failed to generate speech');
  }
}

/**
 * Get available voices from Eleven Labs API
 */
export async function getAvailableVoices(): Promise<any[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json() as { voices?: any[] };
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw new Error('Failed to fetch available voices');
  }
}
