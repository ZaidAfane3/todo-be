#!/bin/bash

TAG=${1:-latest}
IMAGE_NAME="be-service"
gcp_image="us-central1-docker.pkg.dev/personal-473312/microservice/${IMAGE_NAME}"

echo "Building and pushing be-service images..."
docker build --platform linux/x86_64 -t ${gcp_image}:linux-${TAG} .
docker build --platform linux/arm64 -t ${IMAGE_NAME}:mac-${TAG} .
docker push ${gcp_image}:linux-${TAG}

echo "BE service image pushed to: ${gcp_image}:linux-${TAG}"

