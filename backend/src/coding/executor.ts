import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CodingLanguage } from "@prisma/client";

// ---------------------------------------------------------------------------
// Per-language image/command config — see docker/coding-sandbox/README.md
// for the exact same table with the reasoning behind each choice.
// ---------------------------------------------------------------------------

interface LanguageRuntimeConfig {
  sourceFilename: string;
  buildImage?: string; // undefined = interpreted, no compile step
  compileCommand?: string[];
  runImage: string;
  runCommand: string[];
}

const LANGUAGE_CONFIG: Record<CodingLanguage, LanguageRuntimeConfig> = {
  PYTHON: { sourceFilename: "solution.py", runImage: "sandbox-python", runCommand: ["python3", "solution.py"] },
  C: {
    sourceFilename: "solution.c",
    buildImage: "sandbox-c-build",
    // -static: the build and run images can drift in glibc version just
    // like the C++ ones did (see CPP below) — static linking sidesteps
    // that entirely, at the cost of a slightly larger binary.
    compileCommand: ["gcc", "-O2", "-static", "-o", "solution", "solution.c"],
    runImage: "sandbox-c-run",
    runCommand: ["./solution"],
  },
  CPP: {
    sourceFilename: "solution.cpp",
    buildImage: "sandbox-cpp-build",
    // -static-libstdc++ -static-libgcc: sandbox-cpp-build compiles with a
    // newer GCC than sandbox-cpp-run has libstdc++ for (observed: build
    // produces GLIBCXX_3.4.32-dependent binaries, run only has an older
    // libstdc++ that doesn't export it yet, so every submission failed at
    // runtime with "version `GLIBCXX_3.4.32' not found"). Statically linking
    // the C++ runtime into the binary means it carries its own libstdc++/
    // libgcc and no longer depends on whatever version is installed in the
    // run image, so build/run image drift on this axis can't break it again.
    compileCommand: ["g++", "-O2", "-std=c++17", "-static-libstdc++", "-static-libgcc", "-o", "solution", "solution.cpp"],
    runImage: "sandbox-cpp-run",
    runCommand: ["./solution"],
  },
  JAVA: {
    sourceFilename: "Solution.java",
    buildImage: "sandbox-java-build",
    compileCommand: ["javac", "Solution.java"],
    runImage: "sandbox-java-run",
    runCommand: ["java", "-cp", "/sandbox", "Solution"],
  },
  R: { sourceFilename: "solution.r", runImage: "sandbox-r", runCommand: ["Rscript", "solution.r"] },
  SWIFT: {
    sourceFilename: "solution.swift",
    buildImage: "sandbox-swift",
    compileCommand: ["swiftc", "-O", "-o", "solution", "solution.swift"],
    runImage: "sandbox-swift",
    runCommand: ["./solution"],
  },
};

// ---------------------------------------------------------------------------
// Low-level: one `docker run` invocation
// ---------------------------------------------------------------------------

interface DockerRunOptions {
  image: string;
  workdir: string;
  command: string[];
  /** false only for the compile step, which needs to write its output back into workdir. */
  readOnly: boolean;
  stdin?: string;
  timeoutSeconds: number;
  memoryMb: number;
  cpus: number;
}

interface DockerRunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  wallTimeMs: number;
}

function runDocker(opts: DockerRunOptions): Promise<DockerRunResult> {
  const args = [
    "run",
    "--rm",
    "--network",
    "none",
    `--memory=${opts.memoryMb}m`,
    `--memory-swap=${opts.memoryMb}m`, // no swap beyond the hard memory cap
    `--cpus=${opts.cpus}`,
    "--pids-limit=64", // defeats fork bombs
    "--tmpfs",
    "/tmp:rw,size=16m",
    "-v",
    `${opts.workdir}:/sandbox:${opts.readOnly ? "ro" : "rw"}`,
    "-w",
    "/sandbox",
    "-i", // stdin stays open so we can feed the test case's input
    opts.image,
    "timeout",
    String(opts.timeoutSeconds),
    ...opts.command,
  ];

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn("docker", args);

    let stdout = "";
    let stderr = "";
    let settled = false;

    // Outer safety net beyond the in-container `timeout`, in case `docker`
    // itself hangs — spec §42 "infinite-loop protection" shouldn't depend
    // on the sandboxed process alone behaving.
    const killer = setTimeout(() => {
      if (!settled) child.kill("SIGKILL");
    }, (opts.timeoutSeconds + 5) * 1000);

    child.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    child.stdin.write(opts.stdin ?? "");
    child.stdin.end();

    child.on("error", (err) => {
      settled = true;
      clearTimeout(killer);
      reject(err);
    });

    child.on("close", (code) => {
      settled = true;
      clearTimeout(killer);
      resolve({ stdout, stderr, exitCode: code, timedOut: code === 124, wallTimeMs: Date.now() - start });
    });
  });
}

/** `/usr/bin/time -v`'s report lands on stderr — pull the peak-RSS line out and strip its noise. */
function extractMemoryAndCleanStderr(stderr: string): { memoryUsageKb?: number; cleanedStderr: string } {
  const match = stderr.match(/Maximum resident set size \(kbytes\):\s*(\d+)/);
  const timeReportLine = /^\s*(Command being timed|User time|System time|Percent of CPU|Elapsed|Average|Maximum resident|Major|Minor|Voluntary|Involuntary|Swaps|File system|Socket|Signals delivered|Page size|Exit status)/;
  const cleanedStderr = stderr
    .split("\n")
    .filter((line) => !timeReportLine.test(line))
    .join("\n")
    .trim();
  return { memoryUsageKb: match ? Number(match[1]) : undefined, cleanedStderr };
}

// ---------------------------------------------------------------------------
// High-level: run one submission against a set of test cases
// ---------------------------------------------------------------------------

export interface ExecTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface ExecTestCaseResult {
  testCaseId: string;
  isHidden: boolean;
  passed: boolean;
  timedOut: boolean;
  stdout: string;
  stderr: string;
}

export interface ExecutionSummary {
  compileError?: string;
  results: ExecTestCaseResult[];
  passedCount: number;
  totalCount: number;
  maxExecutionTimeMs: number;
  maxMemoryUsageKb?: number;
}

const COMPILE_TIMEOUT_SECONDS = 15;
const COMPILE_MEMORY_MB = 512;
const RUN_TIMEOUT_SECONDS = 5;
const RUN_MEMORY_MB = 256;
const RUN_CPUS = 0.5;

export async function executeSubmission(
  language: CodingLanguage,
  sourceCode: string,
  testCases: ExecTestCase[]
): Promise<ExecutionSummary> {
  const config = LANGUAGE_CONFIG[language];
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "coding-sandbox-"));

  try {
    await fs.writeFile(path.join(workdir, config.sourceFilename), sourceCode, "utf-8");

    if (config.buildImage && config.compileCommand) {
      const build = await runDocker({
        image: config.buildImage,
        workdir,
        command: config.compileCommand,
        readOnly: false,
        timeoutSeconds: COMPILE_TIMEOUT_SECONDS,
        memoryMb: COMPILE_MEMORY_MB,
        cpus: 1,
      });
      if (build.exitCode !== 0) {
        return {
          compileError: (build.stderr || build.stdout || "Compilation failed").slice(0, 4000),
          results: [],
          passedCount: 0,
          totalCount: testCases.length,
          maxExecutionTimeMs: build.wallTimeMs,
        };
      }
    }

    const results: ExecTestCaseResult[] = [];
    let maxTimeMs = 0;
    let maxMemKb: number | undefined;

    for (const tc of testCases) {
      const run = await runDocker({
        image: config.runImage,
        workdir,
        command: ["/usr/bin/time", "-v", ...config.runCommand],
        readOnly: true,
        stdin: tc.input,
        timeoutSeconds: RUN_TIMEOUT_SECONDS,
        memoryMb: RUN_MEMORY_MB,
        cpus: RUN_CPUS,
      });

      const { memoryUsageKb, cleanedStderr } = extractMemoryAndCleanStderr(run.stderr);
      const actualStdout = run.stdout.trim();
      const passed = !run.timedOut && run.exitCode === 0 && actualStdout === tc.expectedOutput.trim();

      maxTimeMs = Math.max(maxTimeMs, run.wallTimeMs);
      if (memoryUsageKb !== undefined) maxMemKb = Math.max(maxMemKb ?? 0, memoryUsageKb);

      results.push({
        testCaseId: tc.id,
        isHidden: tc.isHidden,
        passed,
        timedOut: run.timedOut,
        stdout: actualStdout,
        stderr: cleanedStderr,
      });
    }

    return {
      results,
      passedCount: results.filter((r) => r.passed).length,
      totalCount: testCases.length,
      maxExecutionTimeMs: maxTimeMs,
      maxMemoryUsageKb: maxMemKb,
    };
  } finally {
    await fs.rm(workdir, { recursive: true, force: true }); // spec §42 "automatic cleanup"
  }
}