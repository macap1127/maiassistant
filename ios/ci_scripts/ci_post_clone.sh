#!/bin/sh
set -e

# Xcode Cloud sets this to the repo root
cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node 20 via Homebrew (Xcode Cloud images include brew)
brew install node@20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Build the web app and sync Capacitor
npm ci
npm run build
npx cap sync ios
