#!/bin/bash

# Prerequisites Checker for HTDemucs
# Checks system requirements and provides helpful information

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔧 HTDemucs System Check"
echo "========================="
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
    echo "  └─ Install with: brew install make (macOS) or apt-get install build-essential (Linux)"
fi

echo ""

# Check Python 3 (needed for landing page server)
echo -n "Python 3: "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d ' ' -f2)
    echo -e "${GREEN}✓${NC} Installed (version $PYTHON_VERSION)"
else
    echo -e "${YELLOW}⚠${NC} Not installed (needed for 'make gh-page')"
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

# Check port availability
echo -n "Port 8080: "
if lsof -Pi :8080 -sTCP:LISTEN -t > /dev/null 2>&1; then
    PROCESS=$(lsof -Pi :8080 -sTCP:LISTEN | grep -v COMMAND | awk '{print $1}')
    echo -e "${YELLOW}⚠${NC} In use by $PROCESS"
    echo "  └─ Run 'make stop' to free the port, or the server won't start"
else
    echo -e "${GREEN}✓${NC} Available"
fi

echo ""

# Check Docker images
echo "Docker Images:"
echo -n "  higginsrob/demucs-base:latest: "
if docker image inspect higginsrob/demucs-base:latest > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/demucs-base:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
else
    echo -e "${YELLOW}⚠${NC} Not found"
fi

echo -n "  higginsrob/yt-dlp:latest: "
if docker image inspect higginsrob/yt-dlp:latest > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/yt-dlp:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
else
    echo -e "${YELLOW}⚠${NC} Not found"
fi

echo -n "  higginsrob/htdemucs:local: "
if docker image inspect higginsrob/htdemucs:local > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/htdemucs:local --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
else
    echo -e "${YELLOW}⚠${NC} Not found"
    echo "                         └─ Run 'make build' to build the image"
fi

echo -n "  higginsrob/htdemucs:latest: "
if docker image inspect higginsrob/htdemucs:latest > /dev/null 2>&1; then
    SIZE=$(docker image inspect higginsrob/htdemucs:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
    printf "${GREEN}✓${NC} Built (%.2fGB)\n" "$SIZE"
else
    echo -e "${YELLOW}⚠${NC} Not found"
    echo "                          └─ Run 'make pull' to pull from Docker Hub"
fi

echo ""

# Check if server is running
if docker ps --format '{{.Names}}' | grep -q "^demucs$"; then
    echo "=========================================="
    echo -e "${GREEN}✓ Server is running${NC}"
    echo "  └─ Access at: http://localhost:8080"
    echo "  └─ Stop with: make stop"
    echo ""
fi

# Summary
echo "=========================================="
echo -e "${BLUE}Quick Start Commands:${NC}"
echo "  make build              # Build Docker images"
echo "  make dev                # Run in development mode"
echo "  make run                # Run production server"
echo "  make stop               # Stop running server"
echo "  make gh-page            # Serve landing page locally"
echo "  make help               # Show all commands"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  README.md               # Main documentation"
echo "  landing-page/README.md  # Landing page docs"
echo "  .cursor/rules.md        # Project guidelines"
echo ""

