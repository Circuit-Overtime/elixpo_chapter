minikube stop && \
minikube delete && \
minikube start --driver=docker --force && \
kubectl apply -f k8s/ --validate=false && \
kubectl get pods && \
minikube service audio-pollinations


