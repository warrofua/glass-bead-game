#!/bin/bash

# Glass Bead Game - Development Environment Startup Script
# This script sets up the development environment by:
# 1. Pulling latest changes from main branch
# 2. Installing dependencies
# 3. Building all packages
# 4. Starting the development server

set -e  # Exit on any error

echo "🚀 Starting Glass Bead Game Development Environment..."
echo ""

# Step 1: Git pull from main
echo "📥 Pulling latest changes from origin/main..."
git pull origin main
echo "✅ Git pull completed"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Build all packages
echo "🔨 Building all packages..."
npm run build
echo "✅ Build completed"
echo ""

# Step 4: Start development server
echo "🎮 Starting development server..."
echo "   - Web app will be available at http://localhost:5173"
echo "   - Server will be available at http://localhost:3000"
echo ""
npm run dev
