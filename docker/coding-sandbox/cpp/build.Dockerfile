FROM gcc:13-bookworm

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# Executor runs: g++ -O2 -std=c++17 -o solution solution.cpp
