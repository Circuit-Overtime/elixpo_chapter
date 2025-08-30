echo "[*] Cleaning pip cache..."
rm -rf ~/.cache/pip

echo "[*] Cleaning Hugging Face cache..."
rm -rf ~/.cache/huggingface
rm -rf /root/.cache/huggingface

echo "[*] Cleaning Torch cache..."
rm -rf ~/.cache/torch
rm -rf /root/.cache/torch

echo "[*] Cleaning temporary directories..."
rm -rf /tmp/*
rm -rf /var/tmp/*

echo "[*] Cleanup complete!"
df -h | grep '/$'
