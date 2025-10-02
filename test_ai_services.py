import asyncio
from ai_services import WeatherRAGSystem
async def main():
       rag = WeatherRAGSystem()
       response = await rag.answer_question(
           "What should I wear in New York today?",
           {
               "city": "New York",
               "temperature": 45,
               "weather": "partly cloudy",
               "humidity": 65,
               "wind_speed": 8
           }
       )
       print("AI Response:", response)
       
       if __name__ == "__main__":
        asyncio.run(main())