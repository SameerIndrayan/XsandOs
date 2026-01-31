import { useState, useCallback, useRef, useEffect } from 'react';
import { useWhisperRecording } from '../../hooks/useWhisperRecording';
import { useElevenLabsTTS } from '../../hooks/useElevenLabsTTS';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { askQuestion } from '../../services/api';
import { QAMessage, getAIResponse, generateMessageId } from '../../data/qaResponses';
import styles from './VoiceQA.module.css';

interface VoiceQAProps {
  videoTimestamp: number;
  onListeningChange?: (isListening: boolean) => void;
  /** Use backend APIs (Whisper + Eleven Labs + Gemini) instead of browser APIs */
  useBackendAPIs?: boolean;
}

export const VoiceQA: React.FC<VoiceQAProps> = ({
  videoTimestamp,
  onListeningChange,
  useBackendAPIs = true, // Default to using backend APIs
}) => {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Whisper recording hook (backend API)
  const {
    isRecording: isWhisperRecording,
    isTranscribing,
    startRecording: startWhisperRecording,
    stopRecording: stopWhisperRecording,
    error: whisperError,
    isSupported: whisperSupported,
  } = useWhisperRecording({
    onTranscription: (text) => {
      if (text.trim()) {
        processQuestion(text.trim());
      }
    },
    onStart: () => onListeningChange?.(true),
    onEnd: () => onListeningChange?.(false),
  });

  // Eleven Labs TTS hook (backend API)
  const {
    speak: elevenLabsSpeak,
    stop: stopElevenLabs,
    isSpeaking: isElevenLabsSpeaking,
    isLoading: isTTSLoading,
    error: elevenLabsError,
  } = useElevenLabsTTS();

  // Browser Speech Recognition hook (fallback)
  const {
    isListening: isBrowserListening,
    transcript: browserTranscript,
    startListening: startBrowserListening,
    stopListening: stopBrowserListening,
    isSupported: browserSpeechSupported,
    error: browserSpeechError,
  } = useSpeechRecognition({
    onResult: (text) => {
      if (!useBackendAPIs && text.trim()) {
        processQuestion(text.trim());
      }
    },
    onStart: () => {
      if (!useBackendAPIs) onListeningChange?.(true);
    },
    onEnd: () => {
      if (!useBackendAPIs) onListeningChange?.(false);
    },
  });

  // Browser TTS hook (fallback)
  const {
    speak: browserSpeak,
    stop: stopBrowserSpeaking,
    isSpeaking: isBrowserSpeaking,
    isSupported: browserTTSSupported,
  } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
  });

  // Unified state based on which API is being used
  const isListening = useBackendAPIs ? isWhisperRecording : isBrowserListening;
  const isSpeaking = useBackendAPIs ? isElevenLabsSpeaking : isBrowserSpeaking;
  const speechSupported = useBackendAPIs ? whisperSupported : browserSpeechSupported;
  const speechError = useBackendAPIs ? (whisperError || elevenLabsError) : browserSpeechError;
  const transcript = useBackendAPIs ? currentTranscript : browserTranscript;

  // Process a question (from voice or text)
  const processQuestion = useCallback(async (question: string) => {
    setIsProcessing(true);
    setCurrentTranscript('');

    // Add user message
    const userMessage: QAMessage = {
      id: generateMessageId(),
      type: 'user',
      text: question,
      timestamp: videoTimestamp,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    let response: string;

    if (useBackendAPIs) {
      // Use Gemini API for dynamic response
      try {
        const qaResponse = await askQuestion(question, videoTimestamp);
        response = qaResponse.answer;
      } catch (error) {
        console.error('Gemini Q&A error:', error);
        // Fallback to local responses if API fails
        response = getAIResponse(question, videoTimestamp);
      }
    } else {
      // Use local keyword matching
      await new Promise(resolve => setTimeout(resolve, 500));
      response = getAIResponse(question, videoTimestamp);
    }

    // Add assistant message
    const assistantMessage: QAMessage = {
      id: generateMessageId(),
      type: 'assistant',
      text: response,
      timestamp: videoTimestamp,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Speak the response
    if (useBackendAPIs) {
      try {
        await elevenLabsSpeak(response);
      } catch (error) {
        console.error('Eleven Labs TTS error:', error);
        // Fallback to browser TTS
        if (browserTTSSupported) {
          browserSpeak(response);
        }
      }
    } else if (browserTTSSupported) {
      browserSpeak(response);
    }

    setIsProcessing(false);
    setIsExpanded(true);
  }, [videoTimestamp, useBackendAPIs, elevenLabsSpeak, browserSpeak, browserTTSSupported]);

  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processQuestion(textInput.trim());
      setTextInput('');
    }
  }, [textInput, processQuestion]);

  // Toggle voice listening
  const toggleListening = useCallback(async () => {
    if (useBackendAPIs) {
      if (isWhisperRecording) {
        await stopWhisperRecording();
      } else {
        stopElevenLabs();
        await startWhisperRecording();
      }
    } else {
      if (isBrowserListening) {
        stopBrowserListening();
      } else {
        stopBrowserSpeaking();
        startBrowserListening();
      }
    }
  }, [
    useBackendAPIs,
    isWhisperRecording,
    startWhisperRecording,
    stopWhisperRecording,
    stopElevenLabs,
    isBrowserListening,
    startBrowserListening,
    stopBrowserListening,
    stopBrowserSpeaking,
  ]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Format timestamp for display
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading state during transcription
  const showTranscribing = useBackendAPIs && isTranscribing;
  const showTTSLoading = useBackendAPIs && isTTSLoading;

  return (
    <div className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}>
      {/* Header */}
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.headerLeft}>
          <div className={`${styles.aiIndicator} ${isSpeaking ? styles.speaking : ''}`}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <span className={styles.headerTitle}>
            AI Play Assistant
            {useBackendAPIs && <span className={styles.apiIndicator}> (Gemini)</span>}
          </span>
          {messages.length > 0 && (
            <span className={styles.messageCount}>{messages.length}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          {isListening && (
            <span className={styles.listeningBadge}>
              <span className={styles.listeningDot}></span>
              {showTranscribing ? 'Transcribing...' : 'Listening...'}
            </span>
          )}
          {showTTSLoading && (
            <span className={styles.listeningBadge}>
              Generating voice...
            </span>
          )}
          <button className={styles.expandButton}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
              <path d="M7 10l5 5 5-5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Panel */}
      {isExpanded && (
        <div className={styles.messagesPanel}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
              </div>
              <p className={styles.emptyTitle}>Ask about the play!</p>
              <p className={styles.emptyText}>
                {useBackendAPIs
                  ? 'Click the microphone to ask questions. Using Whisper for transcription, Gemini for answers, and Eleven Labs for voice.'
                  : 'Click the microphone and ask questions like "What formation is this?" or "Why did he fake the handoff?"'
                }
              </p>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${styles[message.type]}`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.messageRole}>
                      {message.type === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className={styles.messageTime}>
                      @ {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  <p className={styles.messageText}>{message.text}</p>
                </div>
              ))}
              {(isProcessing || showTranscribing) && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Text Input */}
          <form className={styles.inputForm} onSubmit={handleTextSubmit}>
            <input
              ref={inputRef}
              type="text"
              className={styles.textInput}
              placeholder="Type a question..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isListening || isProcessing || showTranscribing}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!textInput.trim() || isProcessing || showTranscribing}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Voice Button */}
      <button
        className={`${styles.voiceButton} ${isListening ? styles.listening : ''} ${isSpeaking ? styles.speaking : ''}`}
        onClick={toggleListening}
        disabled={!speechSupported || isProcessing || showTranscribing}
        title={speechSupported ? (isListening ? 'Stop listening' : 'Ask a question') : 'Speech recognition not supported'}
      >
        <div className={styles.voiceButtonInner}>
          {isListening ? (
            <>
              <div className={styles.voiceWaves}>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.micIcon}>
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </>
          ) : isSpeaking || showTTSLoading ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </div>
        {isListening && transcript && (
          <div className={styles.transcriptPreview}>
            "{transcript}"
          </div>
        )}
      </button>

      {/* Error display */}
      {speechError && (
        <div className={styles.errorToast}>
          {speechError}
        </div>
      )}
    </div>
  );
};
