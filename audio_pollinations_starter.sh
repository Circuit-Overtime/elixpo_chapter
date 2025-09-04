cd ~/scratch/audio.pollinations || { echo "Directory not found"; exit 1; }

# Clear port 8000 if in use
echo "Checking if port 8000 is in use and clearing it..."
sudo lsof -ti:8000 | xargs -r sudo kill -9

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

# Start the app with gunicorn, specifying the working directory
echo "Starting the model server"
python src/model_server.py
echo "Starting the app on port 8000..."
hypercorn src.app:app --workers 10 --bind 0.0.0.0:8000