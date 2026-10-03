FROM gcc:13-bookworm

RUN useradd --no-create-home --uid 10001 sandboxuser
WORKDIR /sandbox
USER sandboxuser

# Executor runs: gcc -O2 -o solution solution.c
# (workdir mounted read-write for this step so the compiled binary lands
# back in the host workdir, to be picked up by the run image next.)
