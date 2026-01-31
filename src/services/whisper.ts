/**
 * OpenAI Whisper API integration for speech-to-text
 * Provides more accurate transcription than browser-based Web Speech API
 */

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Transcribe audio using OpenAI's Whisper API
 *
 * @param audioBuffer - Audio file buffer (supports mp3, mp4, mpeg, mpga, m4a, wav, webm)
 * @param filename - Original filename with extension
 * @returns Transcription result with text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Create form data for the API request
  const formData = new FormData();

  // Convert Buffer to Blob for FormData
  const blob = new Blob([audioBuffer], { type: getMimeType(filename) });
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en'); // Optimize for English
  formData.append('response_format', 'json');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', response.status, errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const result = await response.json() as {
      text?: string;
      language?: string;
      duration?: number;
    };

    return {
      text: result.text || '',
      language: result.language,
      duration: result.duration,
    };
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'mp4': 'audio/mp4',
    'mpeg': 'audio/mpeg',
    'mpga': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'ogg': 'audio/ogg',
  };
  return mimeTypes[ext || ''] || 'audio/webm';
}
