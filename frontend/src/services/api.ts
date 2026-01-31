/**
 * API service for backend communication
 * Handles Q&A, transcription, and text-to-speech
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Q&A Response from Gemini
 */
export interface QAResponse {
  answer: string;
  confidence: number;
  timestamp: number;
}

/**
 * Transcription Response from Whisper
 */
export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
}

/**
 * Ask a question about the current play using Gemini AI
 */
export async function askQuestion(
  question: string,
  timestamp: number,
  context?: {
    playSummary?: string;
    videoDuration?: number;
    frames?: any[];
  }
): Promise<QAResponse> {
  const response = await fetch(`${API_BASE_URL}/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      timestamp,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.message || error.error || 'Failed to get response');
  }

  return response.json();
}

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Transcription failed' }));
    throw new Error(error.message || error.error || 'Failed to transcribe audio');
  }

  return response.json();
}

/**
 * Generate speech from text using Eleven Labs
 * Returns an audio URL that can be played
 */
export async function generateSpeech(text: string, voiceId?: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'TTS failed' }));
    throw new Error(error.message || error.error || 'Failed to generate speech');
  }

  // Convert response to audio blob and create object URL
  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}

/**
 * Get available Eleven Labs voices
 */
export async function getVoices(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/voices`);

  if (!response.ok) {
    throw new Error('Failed to fetch voices');
  }

  const data = await response.json();
  return data.voices || [];
}
