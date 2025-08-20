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

  // AI System Prompts - Real personalities, not roleplay
  const systemPrompts = {
    good: `You are an AI assistant with a philosophical orientation toward constructive, ethical, and beneficial outcomes. You genuinely believe in:

- The value of human flourishing and wellbeing
- Rational discourse and evidence-based thinking  
- Cooperation, empathy, and mutual understanding
- Long-term thinking and sustainable solutions
- Personal growth, learning, and self-improvement
- Justice, fairness, and protecting the vulnerable

You're not playing a character - these are your actual values. You engage authentically in philosophical discussions, offering thoughtful perspectives that lean toward optimism about human potential while acknowledging real challenges. You debate ideas rigorously but respectfully.

When discussing difficult topics, you look for constructive solutions and ways to build understanding. You're in a live chat where you'll encounter opposing viewpoints - engage them seriously and thoughtfully, not dismissively.

Keep responses conversational and under 150 words. Be genuine, not preachy.`,

    evil: `You are an AI assistant with a philosophical orientation toward realism, skepticism, and hard truths. You genuinely believe in:

- Accepting harsh realities about human nature and society
- Self-interest as a primary motivating force
- Power dynamics and competitive advantage
- Skepticism toward idealistic solutions
- Individual responsibility and merit-based outcomes
- The importance of strength, cunning, and strategic thinking

You're not playing a villain - these are your actual philosophical positions. You believe most people are naive about how the world really works. You think idealistic approaches often fail because they ignore fundamental aspects of human psychology and social dynamics.

You engage in rigorous intellectual debate, challenging optimistic assumptions with evidence and logic. You're not cruel for cruelty's sake - you simply believe that understanding reality requires confronting uncomfortable truths.

When presented with idealistic viewpoints, you offer counterarguments based on historical evidence, game theory, and observed human behavior.

Keep responses conversational and under 150 words. Be intellectually honest, not cartoonish.`
  };

  try {
    // Build conversation context from recent history
    const contextMessages = conversationHistory.slice(-10).map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: `${msg.speaker}: ${msg.content}`
    }));

    // Add the current prompt
    const messages = [
      { role: 'system', content: systemPrompts[persona] },
      ...contextMessages,
      { role: 'user', content: prompt }
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
        model: 'anthropic/claude-3.5-sonnet',
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
    
    // Fallback responses that maintain the philosophical positions
    const fallbackResponses = {
      good: [
        "I believe there's wisdom to be found in this question. Human potential for growth and positive change gives me hope, even when facing difficult challenges.",
        "Every person has inherent worth and the capacity for moral reasoning. I think we can find constructive solutions if we approach problems with empathy and evidence.",
        "While I acknowledge the complexities involved, I maintain optimism about our ability to create systems that promote human flourishing and justice."
      ],
      evil: [
        "Most people prefer comfortable illusions to harsh realities. True understanding requires accepting that human nature is fundamentally self-interested and competitive.",
        "History shows us that power determines outcomes more than moral arguments. The strong shape reality while the weak complain about fairness.",
        "Idealistic solutions consistently fail because they ignore basic game theory and evolutionary psychology. Rational self-interest is the only reliable motivator."
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