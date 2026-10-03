#!/usr/bin/env bash
# Builds and tags every image referenced by backend/src/coding/executor.ts's
# LANGUAGE_CONFIG. Run once per host before the coding module can execute
# submissions (and again whenever a Dockerfile here changes).
set -euo pipefail
cd "$(dirname "$0")"

echo "Building sandbox-python..."
docker build -t sandbox-python ./python

echo "Building sandbox-c-build / sandbox-c-run..."
docker build -f ./c/build.Dockerfile -t sandbox-c-build ./c
docker build -f ./c/run.Dockerfile   -t sandbox-c-run   ./c

echo "Building sandbox-cpp-build / sandbox-cpp-run..."
docker build -f ./cpp/build.Dockerfile -t sandbox-cpp-build ./cpp
docker build -f ./cpp/run.Dockerfile   -t sandbox-cpp-run   ./cpp

echo "Building sandbox-java-build / sandbox-java-run..."
docker build -f ./java/build.Dockerfile -t sandbox-java-build ./java
docker build -f ./java/run.Dockerfile   -t sandbox-java-run   ./java

echo "Building sandbox-r..."
docker build -t sandbox-r ./r

echo "Building sandbox-swift..."
docker build -t sandbox-swift ./swift

echo "All sandbox images built."
docker images --filter "reference=sandbox-*"
