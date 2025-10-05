#!/usr/bin/env python3
"""
Setup script for Weather AI Chat functionality
This script helps configure the AI services and check dependencies.
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if all required packages are installed"""
    required_packages = [
        'anthropic',
        'pinecone', 
        'sentence_transformers',
        'numpy',
        'dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package} - installed")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - missing")
    
    if missing_packages:
        print(f"\n🚨 Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("\n✅ All dependencies installed!")
    return True

def setup_env_file():
    """Create .env file from template if it doesn't exist"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        # Copy example to .env
        env_content = env_example.read_text()
        env_file.write_text(env_content)
        print("✅ Created .env file from template")
        print("🔧 Please edit .env file with your API keys:")
        print("   - ANTHROPIC_API_KEY (get from: https://console.anthropic.com/)")
        print("   - PINECONE_API_KEY (get from:pcsk_5ZYhDJ_6yLiTG9TctNj1GXRXmLgbNJqCwnCwVQMVEyey2C672zqtL1tLj9xcuTkeE4J7VE  /)")
        print("   - PINECONE_ENVIRONMENT (check your Pinecone dashboardus-east-1-aws)")
    elif env_file.exists():
        print("✅ .env file already exists")
    else:
        print("❌ .env.example not found")

def test_ai_services():
    """Test AI services connectivity"""
    try:
        from ai_services import WeatherRAGSystem
        print("✅ AI services module imported successfully")
        
        # Initialize the system
        rag_system = WeatherRAGSystem()
        print("✅ RAG system initialized")
        
        # Check service availability
        has_claude = bool(rag_system.claude_ai.client)
        has_pinecone = bool(rag_system.pinecone_manager.index)
        
        print(f"🤖 Claude AI: {'✅ Connected' if has_claude else '❌ Not configured'}")
        print(f"📊 Pinecone: {'✅ Connected' if has_pinecone else '❌ Not configured'}")
        print("🧠 Embeddings: ✅ Available")
        
        if not has_claude:
            print("   💡 Set ANTHROPIC_API_KEY in .env file")
        if not has_pinecone:
            print("   💡 Set PINECONE_API_KEY and PINECONE_ENVIRONMENT in .env file")
            
        return has_claude or has_pinecone  # At least one should work
        
    except Exception as e:
        print(f"❌ Error testing AI services: {e}")
        return False

def main():
    """Main setup function"""
    print("🌤️ Weather AI Chat Setup")
    print("=" * 30)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Setup failed - install missing dependencies first")
        sys.exit(1)
    
    print("\n" + "=" * 30)
    
    # Setup environment
    setup_env_file()
    
    print("\n" + "=" * 30)
    
    # Test services
    services_ok = test_ai_services()
    
    print("\n" + "=" * 30)
    
    if services_ok:
        print("🎉 Setup complete! You can now:")
        print("   1. Run: uvicorn main:app --host 0.0.0.0 --port 9000")
        print("   2. Open your browser and test the chat interface")
        print("   3. Try asking: 'What should I wear in Chicago today?'")
    else:
        print("⚠️  Setup completed with warnings.")
        print("   - Basic functionality will work with local fallbacks")
        print("   - Configure API keys for full AI features")
        print("   - Run this script again after setting up .env file")

if __name__ == "__main__":
    main()
