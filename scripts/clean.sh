#!/bin/bash

# Clean script - removes temporary files and outputs
# Useful for testing and cleanup during development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧹 Demucs Cleanup Script"
echo "======================="
echo ""

# Parse command line arguments
CLEAN_OUTPUTS=false
CLEAN_MODELS=false
CLEAN_DOCKER=false
CLEAN_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --outputs)
            CLEAN_OUTPUTS=true
            shift
            ;;
        --models)
            CLEAN_MODELS=true
            shift
            ;;
        --docker)
            CLEAN_DOCKER=true
            shift
            ;;
        --all)
            CLEAN_ALL=true
            CLEAN_OUTPUTS=true
            CLEAN_MODELS=true
            CLEAN_DOCKER=true
            shift
            ;;
        --help)
            echo "Usage: ./scripts/clean.sh [options]"
            echo ""
            echo "Options:"
            echo "  --outputs    Remove all output files"
            echo "  --models     Remove downloaded models (will re-download on next run)"
            echo "  --docker     Remove Docker image (will rebuild on next run)"
            echo "  --all        Clean everything (outputs + models + docker)"
            echo "  --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/clean.sh --outputs           # Clean only outputs"
            echo "  ./scripts/clean.sh --outputs --models  # Clean outputs and models"
            echo "  ./scripts/clean.sh --all               # Clean everything"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Run './scripts/clean.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# If no options provided, show help
if [ "$CLEAN_OUTPUTS" = false ] && [ "$CLEAN_MODELS" = false ] && [ "$CLEAN_DOCKER" = false ]; then
    echo "No cleanup options specified."
    echo ""
    echo "Run './scripts/clean.sh --help' for usage information"
    echo ""
    echo "Quick options:"
    echo "  --outputs    Clean output files (~MBs)"
    echo "  --models     Clean models (~GBs)"
    echo "  --docker     Remove Docker image (~GBs)"
    echo "  --all        Clean everything"
    exit 0
fi

# Clean outputs
if [ "$CLEAN_OUTPUTS" = true ]; then
    echo -n "Removing output files... "
    if [ -d "demucs/output" ]; then
        # Find size before deletion
        SIZE_BEFORE=$(du -sh demucs/output 2>/dev/null | cut -f1 || echo "0")
        
        find demucs/output -type f ! -name '.gitkeep' -delete
        find demucs/output -type d -empty ! -name 'output' -delete
        
        echo -e "${GREEN}✓${NC} (freed $SIZE_BEFORE)"
    else
        echo -e "${YELLOW}⚠${NC} Directory not found"
    fi
fi

# Clean models
if [ "$CLEAN_MODELS" = true ]; then
    echo -n "Removing model files... "
    if [ -d "demucs/models" ]; then
        # Find size before deletion
        SIZE_BEFORE=$(du -sh demucs/models 2>/dev/null | cut -f1 || echo "0")
        
        find demucs/models -type f ! -name '.gitkeep' -delete
        find demucs/models -type d -empty ! -path '*/models' -delete
        
        echo -e "${GREEN}✓${NC} (freed $SIZE_BEFORE)"
        echo -e "  ${YELLOW}Note: Models will re-download on next run${NC}"
    else
        echo -e "${YELLOW}⚠${NC} Directory not found"
    fi
fi

# Clean Docker images
if [ "$CLEAN_DOCKER" = true ]; then
    echo "Removing Docker images..."
    TOTAL_SIZE=0
    
    # Remove server image
    if docker image inspect higginsrob/htdemucs:latest > /dev/null 2>&1; then
        SIZE=$(docker image inspect higginsrob/htdemucs:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
        docker rmi higginsrob/htdemucs:latest > /dev/null 2>&1
        echo -e "  Server image: ${GREEN}✓${NC} (freed $(printf "%.2fGB" "$SIZE"))"
        TOTAL_SIZE=$(echo "$TOTAL_SIZE + $SIZE" | bc)
    fi
    
    # Remove server alias
    if docker image inspect higginsrob/htdemucs:server > /dev/null 2>&1; then
        docker rmi higginsrob/htdemucs:server > /dev/null 2>&1
        echo -e "  Server alias: ${GREEN}✓${NC}"
    fi
    
    # Remove base image
    if docker image inspect higginsrob/htdemucs:demucs > /dev/null 2>&1; then
        SIZE=$(docker image inspect higginsrob/htdemucs:demucs --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
        docker rmi higginsrob/htdemucs:demucs > /dev/null 2>&1
        echo -e "  Base image: ${GREEN}✓${NC} (freed $(printf "%.2fGB" "$SIZE"))"
        TOTAL_SIZE=$(echo "$TOTAL_SIZE + $SIZE" | bc)
    fi
    
    # Remove old image if present
    if docker image inspect xserrat/facebook-demucs:latest > /dev/null 2>&1; then
        SIZE=$(docker image inspect xserrat/facebook-demucs:latest --format='{{.Size}}' | awk '{print $1/1024/1024/1024}')
        docker rmi xserrat/facebook-demucs:latest > /dev/null 2>&1
        echo -e "  Old image: ${GREEN}✓${NC} (freed $(printf "%.2fGB" "$SIZE"))"
        TOTAL_SIZE=$(echo "$TOTAL_SIZE + $SIZE" | bc)
    fi
    
    if [ $(echo "$TOTAL_SIZE > 0" | bc) -eq 1 ]; then
        echo -e "  ${YELLOW}Note: Images will rebuild on next 'make build' or 'make server-build'${NC}"
    else
        echo -e "  ${YELLOW}⚠${NC} No images found to remove"
    fi
fi

echo ""
echo -e "${GREEN}Cleanup complete!${NC}"

