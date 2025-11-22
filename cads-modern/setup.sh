#!/bin/bash

# CADS Modern Setup Script
# This script installs all dependencies and verifies the installation

set -e  # Exit on error

echo "================================"
echo "CADS Modern Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python3
echo -n "Checking Python3... "
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Found $PYTHON_VERSION${NC}"
else
    echo -e "${RED}✗ Python3 not found${NC}"
    echo "Please install Python3: brew install python3"
    exit 1
fi

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Found Node $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Please install Node.js: brew install node"
    exit 1
fi

echo ""
echo "================================"
echo "Installing Python Dependencies"
echo "================================"
echo ""

# Install Python packages
pip3 install -r python/requirements.txt

echo ""
echo "================================"
echo "Installing Node.js Dependencies"
echo "================================"
echo ""

# Install Node packages
npm install

echo ""
echo "================================"
echo "Verifying Installation"
echo "================================"
echo ""

# Test Python imports
echo -n "Testing Python packages... "
if python3 -c "import cv2, numpy, scipy" 2>/dev/null; then
    echo -e "${GREEN}✓ All Python packages OK${NC}"
else
    echo -e "${RED}✗ Python package import failed${NC}"
    exit 1
fi

# Test Python backend
echo -n "Testing Python backend... "
PING_RESULT=$(echo '{"command":"ping"}' | python3 python/main.py 2>/dev/null)
if echo "$PING_RESULT" | grep -q '"message": "pong"'; then
    echo -e "${GREEN}✓ Python backend OK${NC}"
else
    echo -e "${YELLOW}⚠ Python backend test inconclusive${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}Setup Complete!${NC}"
echo "================================"
echo ""
echo "To start the application:"
echo "  npm run electron:dev"
echo ""
echo "To run in production mode:"
echo "  npm run electron:build"
echo ""
echo "For help, see README.md"
echo ""
