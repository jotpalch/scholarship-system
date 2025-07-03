#!/bin/bash

# Scholarship System - Start with IP Address Detection
# This script detects your local IP and configures the frontend to connect to the backend properly

set -e

echo "🚀 Starting Scholarship System with IP Detection..."

# Function to detect local IP
detect_ip() {
    # Try different methods to get the local IP
    local ip=""
    
    # Method 1: Check for common network interfaces
    if command -v ip >/dev/null 2>&1; then
        # Linux with ip command
        ip=$(ip route get 1.1.1.1 | awk '{print $7; exit}' 2>/dev/null || echo "")
    fi
    
    # Method 2: Use hostname -I (Linux)
    if [[ -z "$ip" ]] && command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "")
    fi
    
    # Method 3: Use ifconfig (if available)
    if [[ -z "$ip" ]] && command -v ifconfig >/dev/null 2>&1; then
        ip=$(ifconfig | grep -E "inet ([0-9]{1,3}\.){3}[0-9]{1,3}" | grep -v 127.0.0.1 | awk '{print $2}' | head -1 | sed 's/addr://')
    fi
    
    # Method 4: Check /proc/net/route (Linux specific)
    if [[ -z "$ip" ]] && [[ -f /proc/net/route ]]; then
        local interface=$(awk '$2 == 00000000 { print $1; exit }' /proc/net/route 2>/dev/null || echo "")
        if [[ -n "$interface" ]]; then
            ip=$(ip addr show "$interface" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -1)
        fi
    fi
    
    # Fallback to localhost if no IP found
    if [[ -z "$ip" ]]; then
        ip="localhost"
        echo "⚠️  Could not detect local IP, using localhost"
    fi
    
    echo "$ip"
}

# Detect the host IP
HOST_IP=$(detect_ip)

echo "📍 Detected Host IP: $HOST_IP"
echo "🌐 Frontend will be accessible at: http://$HOST_IP:3000"
echo "🔧 Backend will be accessible at: http://$HOST_IP:8000"
echo ""

# Check if services are already running
if docker ps | grep -q "scholarship_"; then
    echo "⚠️  Existing scholarship services detected. Stopping them first..."
    docker-compose down
fi

# Export the HOST_IP for docker-compose
export HOST_IP="$HOST_IP"

# Start the services
echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Wait for services to be healthy
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose ps | grep -E "(healthy|running)" | wc -l | grep -q "4"; then
        echo "✅ All services are healthy!"
        break
    fi
    
    echo "   Waiting... (attempt $((attempt + 1))/$max_attempts)"
    sleep 5
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Services failed to start properly. Checking status..."
    docker-compose ps
    exit 1
fi

echo ""
echo "🎉 Scholarship System is ready!"
echo ""
echo "📱 Access URLs:"
echo "   Frontend: http://$HOST_IP:3000"
echo "   Backend API: http://$HOST_IP:8000"
echo "   API Docs: http://$HOST_IP:8000/docs"
echo "   MinIO Console: http://$HOST_IP:9001 (admin/minioadmin123)"
echo ""
echo "🔍 To view logs:"
echo "   docker-compose logs -f [service_name]"
echo ""
echo "🛑 To stop:"
echo "   docker-compose down" 