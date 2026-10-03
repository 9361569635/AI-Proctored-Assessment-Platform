# Minimal, non-root Python sandbox image.
# Isolation (network, memory, CPU, pids, filesystem) is applied at `docker run`
# time by the executor service, NOT in this Dockerfile — see ../README.md.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends time \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# No ENTRYPOINT/CMD: the executor supplies the exact command
# (e.g. `timeout 5 /usr/bin/time -v python3 /sandbox/solution.py < input.txt`)
# at run time.
