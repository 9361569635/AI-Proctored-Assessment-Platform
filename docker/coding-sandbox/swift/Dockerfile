FROM swift:5.10

RUN apt-get update && apt-get install -y --no-install-recommends time \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# Executor runs:
#   compile: swiftc -O -o solution solution.swift
#   run:     timeout 5 /usr/bin/time -v ./solution < input.txt
