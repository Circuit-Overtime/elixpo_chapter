if lsof -i:8000 -t >/dev/null; then
    PID=$(lsof -i:8000 -t)
    echo "Stopping process on port 8000 (PID: $PID)"
    kill -9 $PID
fi

docker system prune -a -f && \
docker compose down && \
docker compose build --no-cache && \
docker compose up -d --build 