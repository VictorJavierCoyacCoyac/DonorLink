#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Run the server
echo "🚀 Starting DonorLink API..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000
