import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { QAMessage, generateMessageId } from '../../data/qaResponses';
import styles from './VoiceQA.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface VoiceQAProps {
  videoTimestamp: number;
  onListeningChange?: (isListening: boolean) => void;
  playSummary?: string;
}

export const VoiceQA: React.FC<VoiceQAProps> = ({
  videoTimestamp,
  onListeningChange,
  playSummary,
}) => {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');

  // Speech recognition hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: speechSupported,
    error: speechError,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    onStart: () => onListeningChange?.(true),
    onEnd: () => onListeningChange?.(false),
  });

  // Text-to-speech hook
  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isSupported: ttsSupported,
  } = useTextToSpeech({
    rate: 1.0,
    pitch: 1.0,
  });

  // Handle voice recognition result
  function handleVoiceResult(text: string) {
    if (text.trim()) {
      processQuestion(text.trim());
    }
  }

  // Process a question (from voice or text)
  const processQuestion = useCallback(async (question: string) => {
    setIsProcessing(true);

    // Add user message
    const userMessage: QAMessage = {
      id: generateMessageId(),
      type: 'user',
      text: question,
      timestamp: videoTimestamp,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant' as const,
        content: msg.text,
      }));

      // Call backend chat API
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          videoTimestamp,
          conversationHistory,
          playSummary,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      const aiResponse = data.response || 'I apologize, but I couldn\'t generate a response. Please try again.';

      // Add assistant message
      const assistantMessage: QAMessage = {
        id: generateMessageId(),
        type: 'assistant',
        text: aiResponse,
        timestamp: videoTimestamp,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      if (ttsSupported) {
        speak(aiResponse);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback response
      const fallbackResponse = `I'm having trouble connecting to the AI service right now. At ${videoTimestamp.toFixed(1)} seconds, we're seeing the play develop. Try asking about formations, routes, or player movements!`;
      
      const assistantMessage: QAMessage = {
        id: generateMessageId(),
        type: 'assistant',
        text: fallbackResponse,
        timestamp: videoTimestamp,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (ttsSupported) {
        speak(fallbackResponse);
      }
    } finally {
      setIsProcessing(false);
      setIsExpanded(true);
    }
  }, [videoTimestamp, speak, ttsSupported, messages]);

  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processQuestion(textInput.trim());
      setTextInput('');
    }
  }, [textInput, processQuestion]);

  // Toggle voice listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      stopSpeaking(); // Stop any ongoing speech
      startListening();
    }
  }, [isListening, startListening, stopListening, stopSpeaking]);

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
          <span className={styles.headerTitle}>AI Play Assistant</span>
          {messages.length > 0 && (
            <span className={styles.messageCount}>{messages.length}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          {isListening && (
            <span className={styles.listeningBadge}>
              <span className={styles.listeningDot}></span>
              Listening...
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
                Click the microphone and ask questions like "What formation is this?" or "Why did he fake the handoff?"
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
              {isProcessing && (
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
              disabled={isListening || isProcessing}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={!textInput.trim() || isProcessing}
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
        disabled={!speechSupported || isProcessing}
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
          ) : isSpeaking ? (
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
