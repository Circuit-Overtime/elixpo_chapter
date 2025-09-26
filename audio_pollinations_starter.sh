cd ~/scratch/audio.pollinations || { echo "Directory not found"; exit 1; }

# Clear port 8000 if in use
echo "Checking if port 8000 is in use and clearing it..."
sudo lsof -ti:8000 | xargs -r sudo kill -9

# Clear port 6000 if in use (model server port)
echo "Checking if port 6000 is in use and clearing it..."
sudo lsof -ti:6000 | xargs -r sudo kill -9

# Create virtual environment if not exists
if [ ! -d "higgs_audio_env" ]; then
    echo "Creating virtual environment..."
    python3 -m venv higgs_audio_env
fi

# Activate virtual environment
echo "Activating virtual environment..."
source higgs_audio_env/bin/activate

# Upgrade pip and install dependencies
echo "Installing Python requirements..."
pip install --upgrade pip
pip install -r requirements.txt

# Add both current directory and src directory to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd):$(pwd)/src"

# Start the model server in background
echo "Starting the model server in background..."
python src/model_server.py &
MODEL_SERVER_PID=$!

# Wait a moment for model server to start
echo "Waiting for model server to initialize..."
sleep 15

# Function to cleanup background processes on exit
cleanup() {
    echo "Shutting down processes..."
    kill $MODEL_SERVER_PID 2>/dev/null
    pkill -f "hypercorn src.app:app" 2>/dev/null
    exit
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Start the app with hypercorn
echo "Starting the app on port 8000..."
hypercorn src.app:app --workers 5 --bind 0.0.0.0:8000

wait