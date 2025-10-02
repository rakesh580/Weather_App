# Weather App with AI Chat Integration

🌤️ **Enhanced Weather App with RAG-powered AI Assistant**

## Overview

This weather app now includes an intelligent AI chat assistant that can answer weather-related questions using RAG (Retrieval-Augmented Generation) technology. The assistant combines real-time weather data with curated knowledge to provide helpful responses about weather, clothing recommendations, and safety tips.

## Features

### 🤖 AI Chat Assistant
- **Natural Language Queries**: Ask questions in plain English
- **Context-Aware Responses**: Uses current weather data for your selected location
- **Knowledge Base**: Includes weather science, clothing advice, and safety tips
- **Real-time Integration**: Connects with live weather APIs

### 🧠 RAG Technology
- **Vector Database**: Pinecone for semantic search
- **Embeddings**: Sentence transformers for text understanding
- **AI Model**: Claude AI (Anthropic) for response generation
- **Local Fallback**: Works even without external APIs

### 💬 Chat Interface
- **Modern UI**: Clean, responsive chat widget
- **Real-time Messaging**: Instant responses with typing indicators
- **Mobile-Friendly**: Works on all device sizes
- **Integrated**: Seamlessly embedded in existing weather app

## Example Questions

Try asking the AI assistant:

- **Current Weather**: "What's the weather like in Chicago right now?"
- **Forecasting**: "Will it rain tomorrow in Los Angeles?"
- **Clothing Advice**: "What should I wear in New York today?"
- **Weather Science**: "Why is it so humid in Denver?"
- **Safety Tips**: "How should I drive in snowy conditions?"
- **General Knowledge**: "What causes wind chill?"

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API keys
nano .env
```

Required API keys:
- **ANTHROPIC_API_KEY**: Get from [Anthropic Console](https://console.anthropic.com/)
- **PINECONE_API_KEY**: Get from [Pinecone Dashboard](https://app.pinecone.io/)
- **PINECONE_ENVIRONMENT**: Check your Pinecone dashboard

### 3. Run Setup Script
```bash
python setup_ai.py
```

### 4. Start the Application
```bash
uvicorn main:app --host 0.0.0.0 --port 9000
```

### 5. Test the Chat
1. Open http://localhost:9000
2. Click the chat button (💬) in the bottom-right corner
3. Ask a weather question!

## Architecture

### Backend Components
- **FastAPI**: Web framework with new chat endpoints
- **WeatherRAGSystem**: Main coordinator for AI services
- **PineconeManager**: Vector database operations
- **ClaudeAI**: Response generation
- **WeatherKnowledgeBase**: Curated weather knowledge

### Frontend Components
- **Chat Widget**: Modern floating chat interface
- **Real-time Messaging**: Async communication with backend
- **Integration**: Works with existing weather display

### API Endpoints
- `POST /api/chat`: Send messages to AI assistant
- `GET /api/chat/health`: Check AI services status
- `GET /api/weather`: Original weather endpoint (enhanced for chat)
- `GET /api/forecast`: Original forecast endpoint

## Cost Considerations

### Free Tiers Available
- **Anthropic Claude**: Free tier available
- **Pinecone**: Free starter plan (1M vectors)
- **Sentence Transformers**: Free local processing

### Local Alternatives
- **Ollama**: Local LLM alternative (set up separately)
- **Local Vector DB**: FAISS or Chroma for offline use
- **Knowledge Fallback**: Works with basic keyword matching

## Troubleshooting

### Common Issues

1. **"AI service not configured"**
   - Check .env file has correct API keys
   - Run `python setup_ai.py` to verify setup

2. **Chat not responding**
   - Check browser console for errors
   - Verify server is running on correct port
   - Test `/api/chat/health` endpoint

3. **Slow responses**
   - Normal for first request (model loading)
   - Check internet connection
   - Verify API rate limits

### Debug Mode
```bash
# Check service status
curl http://localhost:9000/api/chat/health

# Test chat endpoint
curl -X POST http://localhost:9000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "timezone": "America/New_York"}'
```

## Customization

### Adding Knowledge
Edit `ai_services.py` → `WeatherKnowledgeBase._load_weather_knowledge()` to add more weather facts, tips, or location-specific information.

### Changing AI Model
Modify `ai_services.py` → `ClaudeAI.generate_response()` to use different models or providers.

### UI Customization
Update `static/index.html` chat styles to match your preferred design.

## Security Notes

- API keys are stored in `.env` file (not committed to git)
- Server validates all input
- Rate limiting recommended for production use
- Consider API key rotation for production

## Performance

- **First Request**: ~2-3 seconds (model initialization)
- **Subsequent Requests**: ~1-2 seconds
- **Knowledge Search**: <100ms
- **Vector DB**: Scales to millions of documents

## Contributing

1. Fork the repository
2. Add your features
3. Test with `python setup_ai.py`
4. Submit pull request

## License

Same as the original weather app project.

---

Built with ❤️ using FastAPI, Claude AI, Pinecone, and modern web technologies.
