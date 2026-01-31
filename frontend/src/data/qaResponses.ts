// Mock Q&A responses for football play analysis
// In production, this would be replaced with actual Gemini API calls

export interface QAMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  timestamp: number; // Video timestamp when question was asked
  createdAt: Date;
}

interface KeywordResponse {
  keywords: string[];
  response: string;
  followUp?: string;
}

// Context-aware responses based on video timestamp
const timeBasedResponses: Record<string, KeywordResponse[]> = {
  '0-1': [ // Pre-snap formation (0-1 seconds)
    {
      keywords: ['formation', 'lineup', 'set', 'position'],
      response: "Right now the offense is in an I-Formation. You can see the quarterback under center, with the running back lined up directly behind him. This is a classic power running formation, but it's also great for play-action passes because it threatens the run.",
    },
    {
      keywords: ['quarterback', 'qb'],
      response: "The quarterback is highlighted in gold. He's positioned directly under the center, which is called being 'under center'. This allows for quick handoffs and play-action fakes, unlike shotgun formation where he stands several yards back.",
    },
    {
      keywords: ['receiver', 'wide', 'wr'],
      response: "You can see two wide receivers split out wide on each side of the formation. They're positioned near the sidelines, ready to run their routes once the ball is snapped.",
    },
  ],
  '1-2': [ // Play action fake (1-2 seconds)
    {
      keywords: ['play action', 'fake', 'handoff'],
      response: "This is a play-action fake! The quarterback is pretending to hand the ball to the running back. Watch how this freezes the defenders - they have to respect the run threat, which gives the receivers extra time to get open downfield.",
    },
    {
      keywords: ['running back', 'rb', 'run'],
      response: "The running back is selling the fake run. See how he's moving forward as if he's receiving the handoff? This is crucial for a successful play-action - if he doesn't sell it, the defense won't bite.",
    },
    {
      keywords: ['defense', 'defender'],
      response: "The defense is reacting to the run fake right now. When linebackers step up to stop what they think is a run, it creates open space in the secondary for the passing play.",
    },
  ],
  '2-3': [ // QB drops back, routes developing (2-3 seconds)
    {
      keywords: ['route', 'go', 'deep', 'downfield'],
      response: "The wide receiver on the left is running a Go Route - that's a straight sprint down the field at full speed. It's one of the simplest but most effective routes when you can get separation from the defender.",
    },
    {
      keywords: ['drop', 'pocket', 'throw'],
      response: "The quarterback has completed his drop back and is now in the pocket. He's reading the defense and looking for his primary receiver. The play-action bought him extra time because the defenders bit on the fake.",
    },
    {
      keywords: ['pass', 'throw', 'ball'],
      response: "The quarterback is about to release the pass. You can see the dashed arrow showing where the ball is going - it's targeting the receiver running the go route on the left side.",
    },
  ],
  '3-4': [ // Ball in air, catch (3-4 seconds)
    {
      keywords: ['catch', 'completion', 'reception'],
      response: "That's a completion! The receiver has caught the ball. A completion means the pass was successfully caught - it's one of the key stats for evaluating quarterback and receiver performance.",
    },
    {
      keywords: ['pass', 'throw', 'ball', 'air'],
      response: "The ball is in the air heading to the receiver. The quarterback threw it to a spot where only his receiver could catch it - this is called 'throwing the receiver open'.",
    },
  ],
  '4-5': [ // After catch, YAC (4-5 seconds)
    {
      keywords: ['yac', 'yards', 'after', 'catch'],
      response: "Now you're seeing YAC - Yards After Catch. This is extra yardage the receiver gains after catching the ball by running. Great receivers are dangerous because they can turn short catches into big gains.",
    },
    {
      keywords: ['run', 'running', 'gain'],
      response: "The receiver is running after the catch, trying to gain extra yards. This is why speed and agility are so important for wide receivers - the catch is just the beginning.",
    },
  ],
  '5-6': [ // End of play, first down (5-6 seconds)
    {
      keywords: ['first down', 'down', 'chains'],
      response: "That's a first down! The offense gained enough yards to earn a new set of four downs. In football, you need to gain 10 yards in 4 plays to keep possession - this play did it in one!",
    },
    {
      keywords: ['tackle', 'stop', 'end'],
      response: "The play ends when the receiver is tackled or goes out of bounds. Even though he was stopped here, the offense gained significant yardage on this play-action pass.",
    },
    {
      keywords: ['success', 'good', 'play'],
      response: "This was a successful play! The combination of the play-action fake, the go route, and the accurate throw resulted in a big gain and a first down. This is exactly what the offense wanted.",
    },
  ],
};

// General responses not tied to specific timestamps
const generalResponses: KeywordResponse[] = [
  {
    keywords: ['what', 'happening', 'going on', 'explain'],
    response: "I'm showing you a play-action deep pass play. The offense fakes a handoff to freeze the defense, then throws deep to a receiver running a go route. It's a classic way to get big yardage when the defense is expecting a run.",
  },
  {
    keywords: ['offense', 'offensive'],
    response: "The offense is the team with the ball, trying to score. They have 4 attempts called 'downs' to move the ball 10 yards. If they succeed, they get a fresh set of downs. The ultimate goal is to reach the end zone for a touchdown.",
  },
  {
    keywords: ['why', 'reason', 'purpose'],
    response: "Play-action works because it exploits the defense's fear of the run. When defenders see the running back moving forward, they instinctively move up to stop him. This creates space behind them for receivers to catch passes.",
  },
  {
    keywords: ['football', 'sport', 'game'],
    response: "Football is a strategic game where teams try to move the ball down the field to score. The offense has 4 attempts to gain 10 yards. Plays like this one combine running threats with passing to keep the defense guessing.",
  },
  {
    keywords: ['help', 'how', 'use'],
    response: "You can ask me anything about what's happening in the play! Try questions like 'What formation is this?', 'Why did the quarterback fake the handoff?', or 'What route is the receiver running?'. I'll explain based on where we are in the video.",
  },
  {
    keywords: ['highlight', 'circle', 'marker', 'annotation'],
    response: "The colored circles highlight key players to watch. Gold typically marks the quarterback, green is for running backs, and blue is for receivers. The arrows show player movement and passing lanes.",
  },
  {
    keywords: ['terminology', 'term', 'word', 'mean'],
    response: "I explain football terms as they appear on screen. You'll see boxes pop up with terms like 'Play Action', 'Go Route', and 'YAC' (Yards After Catch). Each one helps you understand what's happening in the play.",
  },
];

// Find the best matching response based on keywords and timestamp
export const getAIResponse = (question: string, videoTimestamp: number): string => {
  const lowerQuestion = question.toLowerCase();

  // Determine which time range we're in
  let timeRange = '0-1';
  if (videoTimestamp >= 5) timeRange = '5-6';
  else if (videoTimestamp >= 4) timeRange = '4-5';
  else if (videoTimestamp >= 3) timeRange = '3-4';
  else if (videoTimestamp >= 2) timeRange = '2-3';
  else if (videoTimestamp >= 1) timeRange = '1-2';

  // First, try to find a time-specific response
  const timeResponses = timeBasedResponses[timeRange] || [];
  for (const item of timeResponses) {
    if (item.keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return item.response;
    }
  }

  // Fall back to general responses
  for (const item of generalResponses) {
    if (item.keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return item.response;
    }
  }

  // Default response if no match found
  return `Great question! At ${videoTimestamp.toFixed(1)} seconds into the play, we're seeing ${
    videoTimestamp < 1 ? 'the pre-snap formation' :
    videoTimestamp < 2 ? 'the play-action fake' :
    videoTimestamp < 3 ? 'routes developing downfield' :
    videoTimestamp < 4 ? 'the pass being thrown' :
    videoTimestamp < 5 ? 'yards after the catch' :
    'the end of the play'
  }. Try asking about specific elements like "What formation is this?" or "What is play action?"`;
};

// Generate a unique ID for messages
export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
