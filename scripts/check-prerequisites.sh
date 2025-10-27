#!/bin/bash

# Prerequisites Checker for Demucs Development
# Checks system requirements and provides helpful information

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 Demucs Development Prerequisites Check"
echo "=========================================="
echo ""

# Check Docker
echo -n "Docker: "
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓${NC} Installed (version $DOCKER_VERSION)"
    
    # Check if Docker is running
    if docker info > /dev/null 2>&1; then
        echo "  └─ Docker daemon: ${GREEN}Running${NC}"
    else
        echo "  └─ Docker daemon: ${RED}Not running${NC}"
        echo "     Please start Docker Desktop"
    fi
else
    echo -e "${RED}✗${NC} Not installed"
    echo "  └─ Install from: https://www.docker.com/products/docker-desktop"
fi

echo ""

# Check Make
echo -n "Make: "
if command -v make &> /dev/null; then
    MAKE_VERSION=$(make --version | head -n1 | cut -d ' ' -f3)
    echo -e "${GREEN}✓${NC} Installed (version $MAKE_VERSION)"
else
    echo -e "${RED}✗${NC} Not installed"
    echo "  └─ Install with: brew install make"
fi

echo ""

# Check for NVIDIA GPU (optional)
echo -n "NVIDIA GPU: "
if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n1)
    echo -e "${GREEN}✓${NC} Available ($GPU_NAME)"
    
    # Check Docker GPU support
    if docker run --rm --gpus all nvidia/cuda:12.6.2-base-ubuntu22.04 nvidia-smi &> /dev/null; then
        echo "  └─ Docker GPU support: ${GREEN}Enabled${NC}"
    else
        echo "  └─ Docker GPU support: ${YELLOW}Not configured${NC}"
        echo "     Install nvidia-container-toolkit for GPU acceleration"
    fi
else
    echo -e "${YELLOW}⚠${NC} Not available (CPU mode only)"
    echo "  └─ This is fine! Demucs works on CPU, just slower"
fi

echo ""

# Check disk space
echo -n "Disk Space: "
AVAILABLE=$(df -h . | awk 'NR==2 {print $4}')
echo -e "${BLUE}${AVAILABLE}${NC} available"
echo "  └─ Note: Docker images + models require ~5-10GB"

echo ""

# Check input/output/models directories
echo "Directory Structure:"
for dir in "demucs/input" "demucs/output" "demucs/models"; do
    if [ -d "$dir" ]; then
        echo -e "  ${GREEN}✓${NC} $dir exists"
    else
        echo -e "  ${RED}✗${NC} $dir missing"
    fi
done

echo ""

# Check for test file
echo -n "Test Audio File: "
if [ -f "demucs/input/test.mp3" ]; then
    SIZE=$(ls -lh demucs/input/test.mp3 | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Found ($SIZE)"
else
    echo -e "${YELLOW}⚠${NC} Not found"
    echo "  └─ Add a test MP3 to demucs/input/test.mp3 for testing"
fi

echo ""

# Check Docker images
echo "Demucs Docker Images:"
BASE_FOUND=false
SERVER_FOUND=false

if docker image inspect higginsrob/htdemucs:demucs > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/htdemucs:demucs --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "  Base (CLI):   ${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
    BASE_FOUND=true
else
    echo -e "  Base (CLI):   ${YELLOW}⚠${NC} Not built yet"
    echo "                └─ Run 'make build' to build the base image"
fi

if docker image inspect higginsrob/htdemucs:latest > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/htdemucs:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "  Server (Web): ${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
    SERVER_FOUND=true
else
    echo -e "  Server (Web): ${YELLOW}⚠${NC} Not built yet"
    echo "                └─ Run 'make server-build' to build the server image"
fi

# Check for old image
if docker image inspect xserrat/facebook-demucs:latest > /dev/null 2>&1; then
    echo -e "  ${YELLOW}⚠${NC} Old image (xserrat/facebook-demucs:latest) found"
    echo "     └─ Run 'make clean-docker' to remove old images"
fi

echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Quick Start Commands:${NC}"
echo "  make build              # Build Docker image"
echo "  make run track=test.mp3 # Process audio file"
echo "  make run-interactive    # Open shell in container"
echo "  make help               # Show all commands"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  .cursor/rules.md        # Project rules and guidelines"
echo "  README.md               # User documentation"
echo ""

