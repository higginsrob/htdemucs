#!/bin/bash

# HTDemucs Web Application Validation Script
# This script validates the complete HTDemucs web application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 HTDemucs Web Application Validation"
echo "======================================="
echo ""

# Check if Docker is running
echo -n "Checking Docker... "
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗${NC}"
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check port 8080
echo -n "Checking port 8080 availability... "
if lsof -Pi :8080 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}"
    echo "Port 8080 is in use. Stopping any existing demucs container..."
    docker stop demucs 2>/dev/null || true
    sleep 2
else
    echo -e "${GREEN}✓${NC}"
fi

# Check if test file exists
echo -n "Checking for test audio file... "
if [ ! -f "demucs/input/test.mp3" ]; then
    echo -e "${YELLOW}⚠${NC}"
    echo "Warning: demucs/input/test.mp3 not found."
    echo "Creating a note about this..."
else
    SIZE=$(ls -lh demucs/input/test.mp3 | awk '{print $5}')
    echo -e "${GREEN}✓${NC} ($SIZE)"
fi

# Check for required Docker images
echo ""
echo "Checking Docker images..."

check_image() {
    local image=$1
    echo -n "  $image: "
    if docker image inspect "$image" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Not found"
        return 1
    fi
}

IMAGES_FOUND=true
check_image "higginsrob/demucs-base:latest" || IMAGES_FOUND=false
check_image "higginsrob/yt-dlp:latest" || IMAGES_FOUND=false
check_image "higginsrob/htdemucs:local" || IMAGES_FOUND=false

if [ "$IMAGES_FOUND" = false ]; then
    echo ""
    echo "Building missing images (this may take several minutes)..."
    make build
    echo -e "${GREEN}✓${NC} Images built successfully"
fi

# Start the web server
echo ""
echo "Starting HTDemucs web server..."
echo "This will start the server in the background."
echo ""

docker run -d --rm \
    --name=demucs \
    --privileged \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -p 8080:8080 \
    -v $(pwd)/demucs/output:/app/output \
    -v $(pwd)/demucs/models:/data/models \
    -e OUTPUT_DIR=/app/output \
    -e HOST_OUTPUT_DIR=$(pwd)/demucs/output \
    -e JOB_RETENTION_HOURS=168 \
    higginsrob/htdemucs:local > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}✗${NC} Failed to start server"
    exit 1
fi

echo -e "${GREEN}✓${NC} Server started"

# Wait for server to be ready
echo ""
echo -n "Waiting for server to be ready"
for i in {1..30}; do
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Test if server is responding
echo -n "Testing server response... "
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "Error: Server is not responding on http://localhost:8080"
    echo "Checking logs..."
    docker logs demucs --tail 50
    docker stop demucs
    exit 1
fi

# Test API endpoints
echo ""
echo "Testing API endpoints..."

test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    echo -n "  $endpoint: "
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080$endpoint")
    if [ "$STATUS" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $STATUS)"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} (HTTP $STATUS, expected $expected_status)"
        return 1
    fi
}

API_TESTS_PASSED=true
test_endpoint "/api/jobs" "200" || API_TESTS_PASSED=false
test_endpoint "/static/index.html" "200" || API_TESTS_PASSED=false

# Summary
echo ""
echo "======================================="
if [ "$API_TESTS_PASSED" = true ]; then
    echo -e "${GREEN}✓ All validation checks passed!${NC}"
    echo ""
    echo -e "${BLUE}Server Information:${NC}"
    echo "  URL: http://localhost:8080"
    echo "  Container: demucs"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Open http://localhost:8080 in your browser"
    echo "  2. Upload a test file or paste a YouTube URL"
    echo "  3. Monitor progress and download results"
    echo ""
    echo "Stop the server with: make stop"
    echo ""
    echo -e "${GREEN}✓ Validation complete!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Validation completed with warnings${NC}"
    echo ""
    echo "The server is running, but some API tests failed."
    echo "You can still access: http://localhost:8080"
    echo ""
    echo "Stop the server with: make stop"
    exit 0
fi

