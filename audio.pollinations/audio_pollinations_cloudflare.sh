echo "=== Audio Pollinations Deployment Script ==="
echo "This script documents the deployment process for the audio API using Docker Compose and Cloudflare Tunnel"
echo ""

if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared is not installed. Installing..."
    sudo mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
    sudo apt-get update && sudo apt-get install -y cloudflared
fi

echo "cloudflared version: $(cloudflared --version)"
echo ""

echo "=== Manual Setup Instructions ==="
echo "1. Authenticate cloudflared (if not already done):"
echo "   cloudflared tunnel login"
echo ""
echo "2. Create a tunnel (if not already created):"
echo "   cloudflared tunnel create audio-pollinations"
echo ""
echo "3. Create config file at ~/.cloudflared/config.yml with:"
echo "   url: http://localhost:8000"
echo "   tunnel: <YOUR-TUNNEL-UUID>"
echo "   credentials-file: /root/.cloudflared/<YOUR-TUNNEL-UUID>.json"
echo ""
echo "4. Route the tunnel to your domain:"
echo "   cloudflared tunnel route dns audio-pollinations audio.pollinations.ai"
echo ""
echo "5. Build and start the Docker Compose service:"
echo "   cd $(dirname "$0")"
echo "   docker-compose up -d --build"
echo ""
echo "6. Check logs:"
echo "   docker-compose logs -f"
echo ""
echo "7. Start the tunnel:"
echo "   cloudflared tunnel run audio-pollinations"
echo ""
echo "=== To run as a systemd service ==="
echo "   sudo cloudflared service install"
echo "   sudo systemctl start cloudflared"
echo "   sudo systemctl enable cloudflared"
echo ""
echo "=== Current Tunnel Info ==="
cloudflared tunnel list | grep elixpo-audio || echo "No elixpo-audio tunnel found"