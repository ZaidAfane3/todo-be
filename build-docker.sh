#!/bin/bash

TAG=${1:-latest}
IMAGE_NAME="be-service"

docker build --platform linux/x86_64 -t ${IMAGE_NAME}:linux-${TAG} .
docker build --platform linux/arm64 -t ${IMAGE_NAME}:mac-${TAG} .


