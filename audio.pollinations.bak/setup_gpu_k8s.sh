#!/bin/bash
set -e

echo "Detecting Linux distribution..."
. /etc/os-release
echo "Detected distribution: $PRETTY_NAME"

echo "Adding NVIDIA GPG key and repository..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo tee /etc/apt/keyrings/nvidia-container-toolkit.asc > /dev/null

echo "Using generic NVIDIA container toolkit repo (works for Ubuntu 24.04)..."
echo "deb [signed-by=/etc/apt/keyrings/nvidia-container-toolkit.asc] https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /" | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list > /dev/null

echo "Updating package index..."
sudo apt-get update

echo "Installing nvidia-container-toolkit..."
sudo apt-get install -y nvidia-container-toolkit

echo "Configuring containerd for NVIDIA runtime..."
sudo nvidia-ctk runtime configure --runtime=containerd
sudo systemctl restart containerd

echo "Deploying NVIDIA device plugin for Kubernetes..."
kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.5/nvidia-device-plugin.yml


echo "Waiting 10s for NVIDIA plugin pods to come up..."
sleep 10
kubectl get pods -n kube-system | grep nvidia

echo "Restarting audio-pollinations deployment..."
kubectl rollout restart deployment audio-pollinations
echo "Checking pods..."
kubectl get pods -o wide

echo "✅ Setup complete! You can now verify GPUs in pods using:"
echo "kubectl exec -it <pod-name> -- nvidia-smi"
