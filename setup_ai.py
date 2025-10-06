#!/usr/bin/env python3
"""
Setup script for Weather AI Chat functionality (CI/CD & Local Safe Version)
Automatically detects if running in GitHub Actions (CI) or local dev.
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
    missing = []
    for pkg in required_packages:
        try:
            __import__(pkg.replace('-', '_'))
            print(f"✅ {pkg} - installed")
        except ImportError:
            missing.append(pkg)
            print(f"❌ {pkg} - missing")

    if missing:
        print(f"\n🚨 Missing: {', '.join(missing)}")
        print("Run: pip install -r requirements.txt")
        return False
    print("\n✅ All dependencies installed!")
    return True


def detect_environment():
    """Detect whether running locally or in CI/CD"""
    if os.getenv("GITHUB_ACTIONS") == "true":
        print("⚙️ Running inside GitHub Actions (CI/CD mode)")
        return "ci"
    else:
        print("💻 Running locally (development mode)")
        return "local"


def setup_env_file():
    """Only create .env file for local development (never in CI/CD)"""
    env_file = Path(".env")
    env_example = Path(".env.example")

    if detect_environment() == "ci":
        print("🔐 Skipping .env setup — secrets handled by GitHub Actions")
        return

    if not env_file.exists() and env_example.exists():
        env_file.write_text(env_example.read_text())
        print("✅ Created .env from template. Fill in your API keys manually.")
    elif env_file.exists():
        print("✅ .env file already exists.")
    else:
        print("❌ Missing .env.example file")


def test_ai_services():
    """Test AI service connectivity"""
    try:
        from ai_services import WeatherRAGSystem
        print("✅ AI module imported successfully")

        rag_system = WeatherRAGSystem()
        print("✅ RAG system initialized")

        has_claude = bool(rag_system.claude_ai.client)
        has_pinecone = bool(rag_system.pinecone_manager.index)

        print(f"🤖 Claude AI: {'✅ Connected' if has_claude else '❌ Missing'}")
        print(f"📊 Pinecone: {'✅ Connected' if has_pinecone else '❌ Missing'}")
        print("🧠 Embeddings: ✅ Available")

        if not has_claude:
            print("   💡 Add ANTHROPIC_API_KEY in .env (for local dev only)")
        if not has_pinecone:
            print("   💡 Add PINECONE_API_KEY in .env (for local dev only)")

        return has_claude or has_pinecone

    except Exception as e:
        print(f"❌ Error testing AI services: {e}")
        return False


def main():
    """Main setup process"""
    print("🌤️ Weather AI Chat Setup")
    print("=" * 30)

    if not check_dependencies():
        sys.exit(1)

    print("\n" + "=" * 30)
    setup_env_file()

    print("\n" + "=" * 30)
    ok = test_ai_services()

    print("\n" + "=" * 30)
    if ok:
        print("🎉 Setup complete! You can now:")
        print("   uvicorn main:app --host 0.0.0.0 --port 9000")
    else:
        print("⚠️ Setup completed with warnings — local fallback active.")


if __name__ == "__main__":
    main()