#!/bin/bash

# Build script for Docker with Bun
# Run this script from the docker directory

echo "🚀 Building Auto-Subtitle Docker image with Bun..."

# Build the Docker image from parent directory context
docker build -f Dockerfile -t auto-subtitle:bun ../

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the container:"
    echo "  docker run -p 3000:3000 auto-subtitle:bun"
    echo ""
    echo "To run with environment variables:"
    echo "  docker run -p 3000:3000 -e OPENAI_API_KEY=your_key auto-subtitle:bun"
    echo ""
    echo "Or use Docker Compose (from project root):"
    echo "  docker-compose -f docker/docker-compose.yml up"
else
    echo "❌ Docker build failed!"
    exit 1
fi 