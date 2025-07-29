#!/bin/bash

echo "🚀 Starting ESOP Analyzer locally..."
echo ""

# Check if PostgreSQL is running
if ! brew services list | grep postgresql | grep -q started; then
    echo "📦 Starting PostgreSQL..."
    brew services start postgresql@14
    sleep 2
fi

# Check if database exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw esop_analyzer; then
    echo "🗄️ Creating database..."
    createdb esop_analyzer
    psql esop_analyzer -c "CREATE EXTENSION IF NOT EXISTS vector;"
    cd backend && npm run init-db && cd ..
fi

echo "✅ Database ready!"
echo ""
echo "🔧 To start the application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd /Users/charlieney/village_labs/esop-analyzer/backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd /Users/charlieney/village_labs/esop-analyzer/frontend"
echo "  npm start"
echo ""
echo "📋 Next steps:"
echo "1. Add your OpenAI API key to backend/.env"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Upload an ESOP PDF to test the application"
echo ""
echo "💡 Environment files:"
echo "  - backend/.env: Database URL and OpenAI API key"
echo "  - frontend/.env: API URL configuration"