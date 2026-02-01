import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// Request schema
const ChatRequestSchema = z.object({
  question: z.string().min(1),
  videoTimestamp: z.number().nonnegative(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  playSummary: z.string().optional(),
});

/**
 * Mock responses for testing without API key
 */
const getMockResponse = (question: string, timestamp: number, playSummary?: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes('formation')) {
    return `At ${timestamp.toFixed(1)} seconds, we're seeing a classic shotgun formation. The quarterback is positioned about 5 yards behind the center, giving him more time to read the defense. This is a common setup for passing plays, especially on 3rd down situations.`;
  }
  if (q.includes('route') || q.includes('receiver')) {
    return `The receivers are running a combination of routes here. The outside receiver appears to be running a go route or fade, while the slot receiver might be running a crossing route. This creates spacing and forces the defense to make decisions.`;
  }
  if (q.includes('defense') || q.includes('coverage')) {
    return `The defense looks like they're in a zone coverage scheme, likely Cover 2 or Cover 3. You can tell by how the defensive backs are positioned and their responsibilities. They're reading the quarterback's eyes to react to the throw.`;
  }
  if (q.includes('blitz') || q.includes('pressure')) {
    return `Good question! The defense is showing a potential blitz look with linebackers creeping toward the line. This puts pressure on the offense to identify who's coming and adjust their protection accordingly.`;
  }
  if (q.includes('play action') || q.includes('fake')) {
    return `That's a play-action fake! The quarterback fakes a handoff to the running back, trying to freeze the linebackers and safeties. This creates opportunities for receivers downfield as defenders hesitate.`;
  }
  
  return `Great question about the play at ${timestamp.toFixed(1)} seconds! ${playSummary ? `Based on the play summary, ${playSummary.split('.')[0].toLowerCase()}.` : ''} This is a key moment where you can see how offensive and defensive strategies clash. The quarterback is reading the defense and making split-second decisions.`;
};

/**
 * POST /api/chat
 * Chat endpoint for AI assistant using Gemini (with mock mode fallback)
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const body = ChatRequestSchema.parse(req.body);
    const { question, videoTimestamp, conversationHistory = [], playSummary } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.VISIONAGENTS_API_KEY;
    const useMockMode = process.env.CHAT_MOCK_MODE === '1' || !apiKey || apiKey === 'your_gemini_api_key_here';
    
    // If in mock mode, return mock response immediately
    if (useMockMode) {
      console.log('[CHAT] Using mock mode for question:', question);
      const mockResponse = getMockResponse(question, videoTimestamp, playSummary);
      return res.json({
        response: mockResponse,
        timestamp: videoTimestamp,
        mock: true,
      });
    }
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY not configured',
        message: 'AI chat requires Gemini API key',
      });
    }

    // Build full prompt with context and conversation history
    let fullPrompt = `You are an expert football analyst AI assistant helping users understand football plays in real-time. You're analyzing a video play and having a natural conversation about it.

Context:
- Current video timestamp: ${videoTimestamp.toFixed(1)} seconds
${playSummary ? `- Play summary: ${playSummary}` : ''}

Your role:
- Answer questions clearly and conversationally, like a knowledgeable friend explaining football
- Use football terminology naturally but explain complex terms when helpful
- Reference what's happening at the current timestamp when relevant
- Be concise but informative (2-4 sentences typically)
- If asked about something not visible at this timestamp, acknowledge that
- Maintain a friendly, educational, and enthusiastic tone
- Remember previous parts of the conversation for context
- Ask follow-up questions if appropriate to engage the user

Keep responses natural and conversational, not robotic.

`;

    // Add conversation history for context (last 4 messages = 2 exchanges)
    const recentHistory = conversationHistory.slice(-4);
    if (recentHistory.length > 0) {
      fullPrompt += `Previous conversation:\n`;
      for (const msg of recentHistory) {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      }
      fullPrompt += `\n`;
    }

    fullPrompt += `Now answer this question: ${question}`;

    // Try multiple model names and API versions
    const modelsToTry = [
      { name: 'gemini-2.0-flash', version: 'v1beta' },
      { name: 'gemini-2.0-flash-exp', version: 'v1beta' },
      { name: 'gemini-1.5-flash', version: 'v1beta' },
    ];

    let responseText = '';
    let lastError: Error | null = null;

    for (const { name, version } of modelsToTry) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fullPrompt }]
            }]
          }),
        });

        if (response.ok) {
          const data = await response.json() as any;
          responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (responseText) {
            break; // Success, exit loop
          }
        } else {
          const errorText = await response.text();
          lastError = new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue; // Try next model
      }
    }

    // If all models failed, provide a helpful fallback response
    if (!responseText) {
      console.warn('All Gemini models failed, using fallback response:', lastError?.message);
      responseText = `I'm having trouble connecting to the AI service right now. At ${videoTimestamp.toFixed(1)} seconds, we're seeing the play develop. Try asking about formations, routes, or player movements!`;
    }

    res.json({
      response: responseText.trim(),
      timestamp: videoTimestamp,
    });
  } catch (error) {
    console.error('Chat error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        message: error.errors[0].message,
      });
    }
    res.status(500).json({
      error: 'Chat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
