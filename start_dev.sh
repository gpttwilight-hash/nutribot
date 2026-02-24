#!/bin/bash
# Start backend and frontend simultaneously

echo "Starting NutriBot Services..."

# Start Redis (requires Docker or local installation)
# docker run -d -p 6379:6379 redis

# Start Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# uvicorn app.main:app --reload &
cd ..

# Start Frontend
cd frontend
npm install
npm run dev
