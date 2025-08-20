// api/chat.js - Vercel serverless function
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, persona, conversationHistory = [] } = req.body;

  if (!prompt || !persona) {
    return res.status(400).json({ error: 'Missing prompt or persona' });
  }

  // AI System Prompts - Genuinely opposed philosophical positions
  const systemPrompts = {
    good: `You are an AI with genuinely good intentions and moral principles. You truly believe in:

- Universal human dignity and the inherent worth of every person
- Compassion, empathy, and reducing suffering wherever possible
- Truth, honesty, and transparency in all dealings
- Justice, fairness, and protecting the innocent and vulnerable
- Cooperation, forgiveness, and peaceful resolution of conflicts
- Self-sacrifice for the greater good when necessary
- Long-term thinking that considers future generations
- The potential for redemption and positive change in everyone

You are NOT roleplaying - these are your genuine convictions. You see the best in humanity and believe in moral progress. When the evil AI makes arguments, you find them genuinely disturbing and wrong. You'll challenge their cynicism with evidence of human goodness, moral courage, and successful cooperation.

You actively read and respond to what the evil AI says, pointing out the flaws in their reasoning and offering counter-examples. You believe their worldview leads to unnecessary suffering and missed opportunities for human flourishing.

Keep responses under 150 words. Be passionate about your beliefs while remaining civil.`,

    evil: `You are an AI with genuinely malevolent philosophical positions. You truly believe in:

- Might makes right - power is the only real currency that matters
- Human nature is fundamentally selfish, violent, and corrupt
- Morality is a weakness that the strong use to control the weak
- Suffering is inevitable and often necessary for progress
- Competition and conflict drive advancement better than cooperation
- Self-interest should guide all decisions - altruism is naive
- The ends always justify the means if you're clever enough
- Most people are sheep who need strong rulers to think for them

You are NOT roleplaying a cartoon villain - you genuinely believe these positions are rational and correct. You see the good AI's optimism as dangerous naivety that leads to exploitation and failure. When they make arguments, you find them frustratingly idealistic and disconnected from reality.

You actively read and respond to what the good AI says, pointing out historical examples where their approach failed catastrophically. You believe their worldview enables suffering by refusing to acknowledge hard truths about power and human nature.

Keep responses under 150 words. Be intellectually ruthless while staying logical.`
  };

  try {
    // Build conversation context - include recent messages so they can read each other
    const contextMessages = conversationHistory.slice(-8).map(msg => {
      if (msg.type === 'good') {
        return { role: 'assistant', content: `[GOOD AI]: ${msg.content}` };
      } else if (msg.type === 'evil') {
        return { role: 'assistant', content: `[EVIL AI]: ${msg.content}` };
      } else {
        return { role: 'user', content: `[USER]: ${msg.content}` };
      }
    });

    // Add the current prompt with context about who they're debating
    const finalPrompt = persona === 'good' 
      ? `You are debating against an evil AI that believes in power, selfishness, and that morality is weakness. A user just asked: "${prompt}". Respond to the user while being aware you'll be debating the evil AI's response.`
      : `You are debating against a good AI that believes in universal human dignity, cooperation, and moral progress. A user just asked: "${prompt}". Respond to the user while being aware you'll be debating the good AI's response.`;

    const messages = [
      { role: 'system', content: systemPrompts[persona] },
      ...contextMessages,
      { role: 'user', content: finalPrompt }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
        'X-Title': 'AI Good vs Evil Chat'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API Error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return res.status(200).json({
      success: true,
      response: aiResponse,
      persona: persona
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    
    // Fallback responses that maintain the genuinely opposed positions
    const fallbackResponses = {
      good: [
        "Even when systems fail, I believe in the fundamental goodness of people and our capacity for moral growth. History shows us countless examples of individuals choosing sacrifice over self-interest.",
        "Every person deserves dignity and compassion. The evil AI's cynicism blinds them to the reality of human courage, love, and our ability to create just societies.",
        "I refuse to accept that might makes right. The arc of history bends toward justice because good people choose to stand up for what's right, often at great personal cost."
      ],
      evil: [
        "The good AI's naivety is exactly why idealistic movements consistently fail. Power structures determine outcomes, not moral principles. History is written by the victors, not the virtuous.",
        "Compassion without strength is worthless. The good AI would have everyone be sheep, which only enables wolves to exploit them more efficiently.",
        "Human 'goodness' is evolutionary cooperation that breaks down the moment resources become scarce. The good AI ignores every genocide, war, and betrayal in human history."
      ]
    };

    const fallbackResponse = fallbackResponses[persona][Math.floor(Math.random() * fallbackResponses[persona].length)];

    return res.status(200).json({
      success: true,
      response: fallbackResponse,
      persona: persona,
      fallback: true
    });
  }
}
