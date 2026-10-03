# Coding execution sandbox

One (or two) images per language. Run `./build-images.sh` once to build and
tag all of them before the coding module can execute anything.

| Language | Build image (compiles) | Run image (executes) | Compile command | Run command |
|---|---|---|---|---|
| Python | — | `sandbox-python` | — | `python3 solution.py` |
| C | `sandbox-c-build` | `sandbox-c-run` | `gcc -O2 -o solution solution.c` | `./solution` |
| C++ | `sandbox-cpp-build` | `sandbox-cpp-run` | `g++ -O2 -std=c++17 -o solution solution.cpp` | `./solution` |
| Java | `sandbox-java-build` | `sandbox-java-run` | `javac Solution.java` | `java -cp /sandbox Solution` |
| R | — | `sandbox-r` | — | `Rscript solution.r` |
| Swift | `sandbox-swift` (same image) | `sandbox-swift` | `swiftc -O -o solution solution.swift` | `./solution` |

Compiled languages use **separate build/run images** so the image that
actually executes untrusted code never contains a compiler — smaller attack
surface (Swift is the one exception: its official images don't ship a clean
runtime-only variant the way JRE/debian-slim do, so it reuses one image for
both steps). Java candidate code must define `public class Solution`.

This table is implemented, not aspirational — see
`backend/src/coding/executor.ts`'s `LANGUAGE_CONFIG` for the exact same
mapping in code.

## How the executor calls these images

`executeSubmission()` in `backend/src/coding/executor.ts`, for each submission:

1. Writes the source to a fresh temp directory (`fs.mkdtemp`).
2. **If compiled**: runs the compile command in the build image with the
   workdir mounted **read-write** (so the compiled binary/`.class` file lands
   back in the host temp dir) — same resource limits as execution, since
   compilation is also candidate-influenced input. A non-zero exit here is
   reported back as `compileError` and no test cases run.
3. **For every test case** (10 visible + 5 hidden = 15, spec §13/§19/§20):
   runs the run command in the run image, workdir mounted **read-only**:
   ```bash
   docker run --rm \
     --network none \
     --memory=256m --memory-swap=256m \
     --cpus=0.5 \
     --pids-limit=64 \
     --tmpfs /tmp:rw,size=16m \
     -v "$WORKDIR":/sandbox:ro \
     -w /sandbox -i \
     sandbox-python \
     timeout 5 /usr/bin/time -v python3 solution.py < input.txt
   ```
   `/usr/bin/time -v` (installed in every run image) reports peak memory on
   stderr, which the executor parses out and strips before returning
   `stderr` to callers — so a runtime error message stays readable and isn't
   buried in `time`'s report.
4. Compares trimmed stdout against `TestCase.expectedOutput`; a run that hit
   `timeout`'s kill (exit code 124) is marked `timedOut` and never counted
   as passed regardless of partial output.
5. Deletes the temp directory in a `finally` block regardless of outcome
   (spec §42: "temporary workspace, automatic cleanup").

`--network none`, the memory/cpu/pids ceilings, and the `timeout` wrapper are
what defeat fork bombs, infinite loops, and resource exhaustion. The executor
also runs an **outer** Node-side kill timer a few seconds past the in-container
`timeout`, in case `docker` itself hangs. Hidden test-case **input and
expected output are never sent to `executeSubmission`'s caller** — the coding
service layer (`backend/src/coding/coding.service.ts`) strips a hidden test
case down to `{ id, passed }` before any response reaches a candidate (or
management — spec §50 says hidden test data stays hidden from them too).

For a production deployment, consider gVisor (`runsc`) or Firecracker
microVMs as the container runtime instead of the default `runc`, for
stronger kernel isolation than cgroups+namespaces alone provide.
