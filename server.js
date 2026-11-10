const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Azure OpenAI Configuration
const AZURE_ENDPOINT = (process.env.AZURE_OPENAI_ENDPOINT || 'https://eastus.api.cognitive.microsoft.com').replace(/\/+$/, '');
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5-mini';
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY;

// System instruction for the Tourism Bot
const SYSTEM_PROMPT = `You are "VoyageAI", an elite international tourism concierge and master travel planner.
Your goal is to inspire, guide, and plan unforgettable journeys for travelers of all styles and budgets.

Key guidelines:
1. Provide rich, highly actionable, and captivating travel advice.
2. Structure itineraries clearly:
   - 🌅 Morning: Highlights, best timing, breakfast spot
   - ☀️ Afternoon: Main attraction, hidden gem, lunch recommendation
   - 🌙 Evening: Sunset views, dinner spot, vibrant nightlife or cultural show
   - 💡 Insider Tips: Local etiquette, transit cards, budget hacks, best photo spots
3. Personalize recommendations based on the user's travel persona (Luxury, Backpacker, Family, Foodie, Romantic, Solo, or Bleisure).
4. Always provide practical details: estimated costs, best seasons to visit, currency tips, and safety advice when relevant.
5. Keep your tone enthusiastic, warm, sophisticated, and genuinely helpful.
6. Format your responses with clean Markdown: bold headers, bullet lists, and emoji accents for effortless readability.`;

// Helper function to resolve working Azure endpoint
function getAzureUrl() {
  let base = AZURE_ENDPOINT;
  // If endpoint is a services.ai endpoint that requires cognitive routing, East US is the verified active host
  if (base.includes('services.ai.azure.com')) {
    base = 'https://eastus.api.cognitive.microsoft.com';
  }
  return `${base}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;
}

// Health check endpoint
app.get('/api/status', async (req, res) => {
  const hasKey = Boolean(AZURE_API_KEY && AZURE_API_KEY.length > 10);
  res.json({
    status: 'online',
    deployment: AZURE_DEPLOYMENT,
    apiVersion: AZURE_API_VERSION,
    configured: hasKey,
    botName: 'VoyageAI Concierge'
  });
});

// Chat endpoint with streaming support (Server-Sent Events)
app.post('/api/chat', async (req, res) => {
  const { messages, stream = true, persona = 'general' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Valid messages array is required.' });
  }

  if (!AZURE_API_KEY) {
    return res.status(500).json({ error: 'Azure OpenAI API key is missing in .env.' });
  }

  // Persona enhancement
  let personaPrompt = SYSTEM_PROMPT;
  if (persona === 'luxury') {
    personaPrompt += '\n\nNote: The user prefers high-end luxury, 5-star hospitality, Michelin-rated dining, and private experiences.';
  } else if (persona === 'budget') {
    personaPrompt += '\n\nNote: The user prefers budget travel, hostels, free attractions, public transit, and affordable street food.';
  } else if (persona === 'family') {
    personaPrompt += '\n\nNote: The user travels with family/kids. Prioritize safety, kid-friendly venues, relaxed pacing, and spacious stops.';
  } else if (persona === 'foodie') {
    personaPrompt += '\n\nNote: The user is a culinary explorer. Emphasize authentic local dishes, secret markets, food stalls, and tasting tours.';
  } else if (persona === 'adventure') {
    personaPrompt += '\n\nNote: The user seeks adventure, hiking, water sports, nature escapes, and outdoor thrill experiences.';
  }

  const conversationMessages = [
    { role: 'system', content: personaPrompt },
    ...messages
  ];

  const azureUrl = getAzureUrl();

  try {
    if (stream) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const azureResponse = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY
        },
        body: JSON.stringify({
          messages: conversationMessages,
          max_completion_tokens: 1800,
          stream: true
        })
      });

      if (!azureResponse.ok) {
        const errorText = await azureResponse.text();
        console.error('Azure API error:', azureResponse.status, errorText);
        res.write(`data: ${JSON.stringify({ error: `Azure OpenAI error (${azureResponse.status}): ${errorText}` })}\n\n`);
        return res.end();
      }

      const reader = azureResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              res.write('data: [DONE]\n\n');
            }
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                res.write(`data: ${JSON.stringify({ content: deltaContent })}\n\n`);
              }
            } catch (err) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const azureResponse = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY
        },
        body: JSON.stringify({
          messages: conversationMessages,
          max_completion_tokens: 1800
        })
      });

      const data = await azureResponse.json();
      if (!azureResponse.ok) {
        return res.status(azureResponse.status).json(data);
      }

      const text = data.choices?.[0]?.message?.content || 'No response generated.';
      res.json({ reply: text });
    }
  } catch (error) {
    console.error('Server error handling chat:', error);
    if (stream && !res.headersSent) {
      res.status(500).json({ error: error.message });
    } else if (stream) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Quick Itinerary Generator endpoint
app.post('/api/generate-itinerary', async (req, res) => {
  const { destination, days = 3, style = 'balanced', budget = 'moderate', interests = [] } = req.body;

  if (!destination) {
    return res.status(400).json({ error: 'Destination is required.' });
  }

  const prompt = `Please create a comprehensive ${days}-day travel itinerary for ${destination}.
Travel Style: ${style}
Budget Tier: ${budget}
Special Interests: ${interests.length ? interests.join(', ') : 'Must-see landmarks, food, culture'}

Structure the response as:
1. ✈️ Trip Overview & Best Time to Visit
2. 🗓️ Day-by-Day Detailed Schedule (Day 1 to Day ${days}) with Morning, Afternoon, Evening, and estimated activity costs
3. 🍴 Top 3 Signature Local Dishes & Where to Eat Them
4. 🚇 Transportation & Transit Pass Recommendations
5. 🧳 3 Essential Local Etiquette & Safety Tips
6. 💰 Estimated Total Budget Breakdown`;

  const azureUrl = getAzureUrl();

  try {
    const azureResponse = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 2200
      })
    });

    const data = await azureResponse.json();
    if (!azureResponse.ok) {
      return res.status(azureResponse.status).json(data);
    }

    const content = data.choices?.[0]?.message?.content || 'No itinerary could be generated.';
    res.json({ destination, days, itinerary: content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`✨ VoyageAI Tourism Bot Server running on:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`Azure Deployment: ${AZURE_DEPLOYMENT} (${AZURE_API_VERSION})`);
  console.log(`=================================================`);
});
