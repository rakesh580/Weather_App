import os
import asyncio
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

import numpy as np
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone, ServerlessSpec
from anthropic import Anthropic
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class WeatherKnowledgeBase:
    """Manages weather-related knowledge and embeddings"""
    
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.knowledge_data = self._load_weather_knowledge()
    
    def _load_weather_knowledge(self) -> List[Dict[str, Any]]:
        """Load curated weather knowledge base"""
        return [
            {
                "id": "temp_clothing_cold",
                "content": "When temperatures are below 32°F (0°C), wear insulated layers, warm coat, gloves, hat, and waterproof boots. Consider thermal underwear for extended outdoor exposure.",
                "category": "clothing",
                "temperature_range": "below_freezing"
            },
            {
                "id": "temp_clothing_cool",
                "content": "For temperatures 32-60°F (0-15°C), wear a light jacket or sweater, long pants, and closed-toe shoes. Layers are recommended for temperature changes.",
                "category": "clothing",
                "temperature_range": "cool"
            },
            {
                "id": "temp_clothing_mild",
                "content": "At 60-75°F (15-24°C), light clothing like t-shirts, light sweaters, jeans or light pants work well. Perfect for most outdoor activities.",
                "category": "clothing",
                "temperature_range": "mild"
            },
            {
                "id": "temp_clothing_warm",
                "content": "For 75-85°F (24-29°C), wear light, breathable clothing like cotton t-shirts, shorts, sundresses, and sandals. Stay hydrated.",
                "category": "clothing",
                "temperature_range": "warm"
            },
            {
                "id": "temp_clothing_hot",
                "content": "Above 85°F (29°C), wear minimal, light-colored, loose-fitting clothing. Use sun protection, stay in shade when possible, and drink plenty of water.",
                "category": "clothing",
                "temperature_range": "hot"
            },
            {
                "id": "rain_safety",
                "content": "During rain, carry an umbrella or wear waterproof clothing. Drive carefully with reduced speed and increased following distance. Avoid flooded roads.",
                "category": "safety",
                "weather_condition": "rain"
            },
            {
                "id": "snow_safety",
                "content": "In snow conditions, wear appropriate footwear with good traction. Drive slowly and keep emergency supplies in your car. Clear snow from vehicle before driving.",
                "category": "safety",
                "weather_condition": "snow"
            },
            {
                "id": "humidity_effects",
                "content": "High humidity (above 60%) makes temperatures feel warmer and can cause discomfort. Low humidity (below 30%) can cause dry skin and respiratory irritation.",
                "category": "weather_science",
                "topic": "humidity"
            },
            {
                "id": "wind_chill",
                "content": "Wind chill occurs when wind speed combines with cold temperatures to make it feel colder than actual temperature. Important for exposed skin safety.",
                "category": "weather_science",
                "topic": "wind_chill"
            },
            {
                "id": "heat_index",
                "content": "Heat index combines air temperature and humidity to determine perceived temperature. Values above 90°F indicate caution needed for outdoor activities.",
                "category": "weather_science",
                "topic": "heat_index"
            },
            {
                "id": "denver_altitude",
                "content": "Denver's high altitude (5,280 feet) affects weather: lower air pressure, intense UV rays, rapid temperature changes, and dry air. Stay hydrated and use sun protection.",
                "category": "location_specific",
                "location": "denver"
            },
            {
                "id": "chicago_lake_effect",
                "content": "Chicago experiences lake effect from Lake Michigan, creating cooler summers and moderating winter temperatures. Can cause sudden weather changes.",
                "category": "location_specific",
                "location": "chicago"
            },
            {
                "id": "los_angeles_marine_layer",
                "content": "Los Angeles often has marine layer fog in mornings, especially in summer. Creates overcast conditions that typically clear by afternoon.",
                "category": "location_specific",
                "location": "los_angeles"
            }
        ]
    
    def create_embeddings(self) -> Dict[str, np.ndarray]:
        """Create embeddings for all knowledge items"""
        embeddings = {}
        for item in self.knowledge_data:
            text = f"{item['content']} {item['category']}"
            embedding = self.model.encode(text)
            embeddings[item['id']] = embedding
        return embeddings

class PineconeManager:
    """Manages Pinecone vector database operations"""
    
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.index_name = "weather-knowledge"
        self.index = None
        self.pc = None
        
        if self.api_key:
            self._initialize_pinecone()
    
    def _initialize_pinecone(self):
        """Initialize Pinecone connection"""
        try:
            self.pc = Pinecone(api_key=self.api_key)
            
            # Create index if it doesn't exist
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            if self.index_name not in existing_indexes:
                self.pc.create_index(
                    name=self.index_name,
                    dimension=384,  # all-MiniLM-L6-v2 dimension
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region="us-east-1"
                    )
                )
            
            self.index = self.pc.Index(self.index_name)
        except Exception as e:
            print(f"Failed to initialize Pinecone: {e}")
            self.index = None
    
    def upsert_knowledge(self, knowledge_base: WeatherKnowledgeBase):
        """Upload knowledge base to Pinecone"""
        if not self.index:
            return False
        
        try:
            embeddings = knowledge_base.create_embeddings()
            vectors = []
            
            for item in knowledge_base.knowledge_data:
                vectors.append({
                    "id": item["id"],
                    "values": embeddings[item["id"]].tolist(),
                    "metadata": {
                        "content": item["content"],
                        "category": item["category"],
                        **{k: v for k, v in item.items() if k not in ["id", "content", "category"]}
                    }
                })
            
            self.index.upsert(vectors=vectors)
            return True
        except Exception as e:
            print(f"Failed to upsert knowledge: {e}")
            return False
    
    def search_knowledge(self, query_embedding: np.ndarray, top_k: int = 3) -> List[Dict]:
        """Search for relevant knowledge"""
        if not self.index:
            return []
        
        try:
            results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_metadata=True
            )
            
            return [
                {
                    "content": match["metadata"]["content"],
                    "score": match["score"],
                    "category": match["metadata"]["category"]
                }
                for match in results["matches"]
            ]
        except Exception as e:
            print(f"Failed to search knowledge: {e}")
            return []

class ClaudeAI:
    """Manages Claude AI interactions"""
    
    def __init__(self):
        self.client = None
        api_key = os.getenv("ANTHROPIC_API_KEY")
        
        if api_key:
            self.client = Anthropic(api_key=api_key)
    
    async def generate_response(self, query: str, context: List[Dict], weather_data: Optional[Dict] = None) -> str:
        """Generate AI response using Claude"""
        if not self.client:
            return "AI service is not configured. Please set up your Anthropic API key."
        
        try:
            # Build context from retrieved knowledge
            context_text = "\n".join([
                f"- {item['content']}" for item in context
            ])
            
            # Add current weather data if available
            weather_context = ""
            if weather_data:
                weather_context = f"""
Current Weather Data:
- Location: {weather_data.get('city', 'Unknown')}
- Temperature: {weather_data.get('temperature', 'N/A')}°F
- Weather: {weather_data.get('weather', 'N/A')}
- Humidity: {weather_data.get('humidity', 'N/A')}%
- Wind Speed: {weather_data.get('wind_speed', 'N/A')} mph
"""
            
            prompt = f"""You are a helpful weather assistant. Answer the user's weather-related question using the provided context and current weather data.

{weather_context}

Relevant Knowledge:
{context_text}

User Question: {query}

Provide a helpful, accurate, and conversational response. If asking about current weather, use the current weather data. If asking about clothing recommendations or safety, use the relevant knowledge. Keep responses concise but informative."""

            message = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            return message.content[0].text
            
        except Exception as e:
            return f"Sorry, I encountered an error generating a response: {str(e)}"

class WeatherRAGSystem:
    """Main RAG system coordinator"""
    
    def __init__(self):
        self.knowledge_base = WeatherKnowledgeBase()
        self.pinecone_manager = PineconeManager()
        self.claude_ai = ClaudeAI()
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize knowledge base
        self._setup_knowledge_base()
    
    def _setup_knowledge_base(self):
        """Set up the knowledge base in Pinecone"""
        success = self.pinecone_manager.upsert_knowledge(self.knowledge_base)
        if success:
            print("Knowledge base successfully uploaded to Pinecone")
        else:
            print("Warning: Knowledge base upload failed, using local fallback")
    
    async def answer_question(self, query: str, weather_data: Optional[Dict] = None) -> str:
        """Main method to answer weather-related questions"""
        try:
            # Create query embedding
            query_embedding = self.embedder.encode(query)
            
            # Search for relevant knowledge
            relevant_context = self.pinecone_manager.search_knowledge(query_embedding)
            
            # Fallback to local search if Pinecone fails
            if not relevant_context:
                relevant_context = self._local_knowledge_search(query)
            
            # Generate response using Claude
            response = await self.claude_ai.generate_response(
                query=query,
                context=relevant_context,
                weather_data=weather_data
            )
            
            return response
            
        except Exception as e:
            return f"Sorry, I couldn't process your question: {str(e)}"
    
    def _local_knowledge_search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Fallback local knowledge search"""
        query_lower = query.lower()
        relevant_items = []
        
        for item in self.knowledge_base.knowledge_data:
            content_lower = item['content'].lower()
            category_lower = item['category'].lower()
            
            # Simple keyword matching
            if any(word in content_lower or word in category_lower 
                   for word in query_lower.split()):
                relevant_items.append({
                    "content": item["content"],
                    "score": 0.8,  # Default score for local search
                    "category": item["category"]
                })
        
        return relevant_items[:top_k]
