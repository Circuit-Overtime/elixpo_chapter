#!/usr/bin/env python3
"""
Test script for the Elixpo Search Embedding IPC System
Tests connection and basic functionality of the embedding server
"""

import sys
import time
from pathlib import Path

# Add src directory to path
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

from embeddingClient import get_embedding_client
from loguru import logger

def test_connection():
    """Test basic connection to embedding server"""
    logger.info("Testing connection to embedding server...")
    
    try:
        client = get_embedding_client()
        active_ops = client.get_active_operations_count()
        logger.success(f"Connected successfully! Active operations: {active_ops}")
        return True
    except Exception as e:
        logger.error(f"Connection failed: {e}")
        return False

def test_embeddings():
    """Test embedding generation"""
    logger.info("Testing embedding generation...")
    
    try:
        client = get_embedding_client()
        
        # Test texts
        texts = [
            "This is a test sentence for embedding.",
            "Machine learning is a powerful technology.",
            "Search engines help find relevant information."
        ]
        
        start_time = time.time()
        embeddings = client.generate_embeddings(texts)
        elapsed = time.time() - start_time
        
        logger.success(f"Generated embeddings shape: {embeddings.shape} in {elapsed:.2f}s")
        return True
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return False

def test_web_search():
    """Test web search with embeddings"""
    logger.info("Testing web search with embeddings...")
    
    try:
        client = get_embedding_client()
        
        query = "artificial intelligence latest developments"
        start_time = time.time()
        result, urls = client.web_search_with_embeddings(query, max_concurrent=3, max_chars=1000)
        elapsed = time.time() - start_time
        
        logger.success(f"Web search completed in {elapsed:.2f}s")
        logger.info(f"Found {len(urls)} sources")
        logger.info(f"Result preview: {result[:200]}...")
        return True
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Starting Elixpo Search Embedding IPC Tests")
    logger.info("=" * 50)
    
    tests = [
        ("Connection Test", test_connection),
        ("Embedding Generation Test", test_embeddings),
        ("Web Search Test", test_web_search)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"\n🧪 Running {test_name}")
        try:
            if test_func():
                passed += 1
                logger.success(f"✅ {test_name} PASSED")
            else:
                logger.error(f"❌ {test_name} FAILED")
        except Exception as e:
            logger.error(f"❌ {test_name} ERROR: {e}")
    
    logger.info("\n" + "=" * 50)
    logger.info(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        logger.success("🎉 All tests passed!")
        return 0
    else:
        logger.error(f"💥 {total - passed} tests failed")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)