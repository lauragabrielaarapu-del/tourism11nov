# VoyageAI — Intelligent Global Tourism & Travel Concierge

An AI-powered luxury tourism concierge and itinerary planner powered by **Azure OpenAI** (`gpt-5-mini`). VoyageAI crafts bespoke day-by-day itineraries, uncovers secret local gems, recommends authentic dining spots, and provides budget and cultural etiquette advice.

## ✨ Features

- **Azure OpenAI Intelligence**: Powered by `gpt-5-mini` with real-time streaming responses (Server-Sent Events).
- **Custom Itinerary Architect (Trip Planner Wizard)**: Configure destination, duration (1–14 days), budget tier, travel style, and special interests.
- **Dynamic Traveler Personas**: Switch between Luxury VIP, Backpacker, Foodie, Family-Friendly, and Adventure modes.
- **Voice Interactions**:
  - 🎙️ Speech-to-Text: Dictate questions or destinations using voice recognition.
  - 🔊 Text-to-Speech: Listen to generated travel plans with audio narration.
- **Export & Share**: Download itineraries as Markdown/Text files or copy directly to clipboard.
- **Trending Destination Guides**: Fast-track guides for Dubai, Tokyo, Paris, Rome, Bali, and New York.

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/lauragabrielaarapu-del/tourism11nov.git
cd tourism11nov
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2024-06-01
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
PORT=3001
```

### 4. Run the application
```bash
npm start
```

Visit [http://localhost:3001](http://localhost:3001) in your browser.
