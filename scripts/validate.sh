#!/bin/bash

# Demucs CLI Validation Script
# This script validates the complete demucs workflow

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Demucs CLI Validation Script"
echo "================================"
echo ""

# Check if Docker is running
echo -n "Checking if Docker is running... "
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗${NC}"
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check if test file exists
echo -n "Checking for test audio file... "
if [ ! -f "demucs/input/test.mp3" ]; then
    echo -e "${YELLOW}⚠${NC}"
    echo "Warning: demucs/input/test.mp3 not found."
    echo "Please add a test audio file to demucs/input/test.mp3"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Build image if it doesn't exist
echo -n "Checking for demucs Docker image... "
if ! docker image inspect xserrat/facebook-demucs:latest > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}"
    echo "Image not found. Building now (this may take a few minutes)..."
    make build
    echo -e "${GREEN}✓${NC} Image built successfully"
else
    echo -e "${GREEN}✓${NC}"
fi

# Clean up previous test outputs
echo -n "Cleaning previous test outputs... "
rm -rf demucs/output/htdemucs_ft/test
echo -e "${GREEN}✓${NC}"

# Run demucs on test file
echo ""
echo "Running demucs on test.mp3..."
echo "This may take a few minutes depending on your system..."
echo ""
if make run track=test.mp3 model=htdemucs_ft mp3output=true; then
    echo -e "${GREEN}✓${NC} Demucs completed successfully"
else
    echo -e "${RED}✗${NC} Demucs failed"
    exit 1
fi

# Verify output files
echo ""
echo "Verifying output files..."

OUTPUT_DIR="demucs/output/htdemucs_ft/test"
EXPECTED_FILES=("bass.mp3" "drums.mp3" "vocals.mp3" "other.mp3")
ALL_EXIST=true

for file in "${EXPECTED_FILES[@]}"; do
    echo -n "  Checking $file... "
    if [ -f "$OUTPUT_DIR/$file" ]; then
        SIZE=$(ls -lh "$OUTPUT_DIR/$file" | awk '{print $5}')
        echo -e "${GREEN}✓${NC} ($SIZE)"
    else
        echo -e "${RED}✗${NC}"
        ALL_EXIST=false
    fi
done

# Summary
echo ""
echo "================================"
if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo ""
    echo "Output files are located in: $OUTPUT_DIR"
    echo ""
    echo "You can listen to them with:"
    echo "  open $OUTPUT_DIR/vocals.mp3"
    exit 0
else
    echo -e "${RED}✗ Validation failed: Some output files are missing${NC}"
    exit 1
fi

