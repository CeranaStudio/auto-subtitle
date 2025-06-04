#!/bin/bash

# Build script for Docker with Bun
# This script can be run from either the docker directory or project root

echo "🚀 Building Auto-Subtitle Docker image with Bun..."

# Determine the correct context and dockerfile path based on current directory
if [[ $(basename "$PWD") == "docker" ]]; then
    # Running from docker directory
    echo "📁 Running from docker directory"
    docker build -f Dockerfile -t auto-subtitle:bun ../
else
    # Running from project root
    echo "📁 Running from project root"
    docker build -f docker/Dockerfile -t auto-subtitle:bun .
fi

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 3000:3000 auto-subtitle:bun"
    echo ""
    echo "To run with environment variables:"
    echo "  docker run -p 3000:3000 -e OPENAI_API_KEY=your_key auto-subtitle:bun"
    echo ""
    echo "Or use Docker Compose:"
    echo "  From docker directory: docker-compose up"
    echo "  From project root: docker-compose -f docker/docker-compose.yml up"
else
    echo "❌ Docker build failed!"
    exit 1
fi 