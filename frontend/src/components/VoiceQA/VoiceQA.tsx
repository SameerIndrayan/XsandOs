import { useState, useCallback, useRef, useEffect } from 'react';
import { askQuestion } from '../../services/api';
import { QAMessage, getAIResponse, generateMessageId } from '../../data/qaResponses';
import styles from './VoiceQA.module.css';

interface VoiceQAProps {
  videoTimestamp: number;
  onListeningChange?: (isListening: boolean) => void;
}

export const VoiceQA: React.FC<VoiceQAProps> = ({
  videoTimestamp,
}) => {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded for easier testing
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Process a question (text only)
  const processQuestion = useCallback(async (question: string) => {
    setIsProcessing(true);
    setError(null);

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

    // Try Gemini API first, fall back to local keyword matching
    try {
      console.log('Calling Gemini API...');
      const qaResponse = await askQuestion(question, videoTimestamp);
      response = qaResponse.answer;
      console.log('Gemini response:', response);
    } catch (err) {
      console.error('Gemini Q&A error:', err);
      setError(`API Error: ${err instanceof Error ? err.message : 'Unknown error'}. Using fallback.`);
      // Fallback to local keyword-matching responses
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

    setIsProcessing(false);
  }, [videoTimestamp]);

  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      processQuestion(textInput.trim());
      setTextInput('');
    }
  }, [textInput, processQuestion, isProcessing]);

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
          <div className={styles.aiIndicator}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <span className={styles.headerTitle}>
            AI Play Assistant
            <span className={styles.apiIndicator}> (Text)</span>
          </span>
          {messages.length > 0 && (
            <span className={styles.messageCount}>{messages.length}</span>
          )}
        </div>
        <div className={styles.headerRight}>
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
                Type a question like "What is a play-action pass?" or "What formation is this?"
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

          {/* Error display */}
          {error && (
            <div className={styles.errorBanner}>
              {error}
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
              disabled={isProcessing}
              autoFocus
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
    </div>
  );
};
