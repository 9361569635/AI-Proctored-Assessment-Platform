import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as assessmentService from "../../services/assessment.service";
import { ApiClientError } from "../../services/apiClient";
import { useCountdown } from "../../hooks/useCountdown";
import { useAuth } from "../../hooks/useAuth";
import { formatSeconds } from "../../utils/formatTime";
import { McqQuestionPanel } from "../../components/assessment/McqSessionView";
import { CodingQuestionCard } from "../../components/assessment/CodingSessionView";
import { ProctoringMonitor } from "../../components/ProctoringMonitor";
import { SessionInstructionsPanel } from "../../components/assessment/SessionInstructionsPanel";
import { DynamicWatermark } from "../../components/DynamicWatermark";
import { recordSecurityCapabilities } from "../../services/proctoring.service";
import type { CurrentSessionResponse, McqQuestion } from "../../types/assessment";

const SESSION_LABELS: Record<string, string> = {
  APTITUDE: "Aptitude",
  LOGICAL: "Logical Ability",
  REASONING: "Reasoning",
  COMMUNICATION: "Sentence Correction",
  GRAMMAR: "English Grammar",
  EASY_CODING: "Easy Coding",
  MODERATE_CODING: "Moderate Coding",
  HARD_CODING: "Hard Coding",
};

const RESYNC_INTERVAL_MS = 20_000;

export function AssessmentRunnerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState<CurrentSessionResponse | null>(null);
  const [runQuestionIds, setRunQuestionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);

  const [index, setIndex] = useState(0);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const loadCurrentSession = useCallback(async () => {
    try {
      const s = await assessmentService.getCurrentSession();
      setSession(s);
      if (s.format === "CODING") {
        setRunQuestionIds(new Set(s.codingQuestions.filter((q) => q.hasRun).map((q) => q.id)));
      } else {
        setRunQuestionIds(new Set());
      }
      setError(null);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 409 || err.status === 404)) {
        navigate("/candidate/result");
        return;
      }
      setError(err instanceof ApiClientError ? err.message : "Couldn't load your session");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    setIndex(0);
    setSkippedIds(new Set());
  }, [session?.sessionId]);

  useEffect(() => {
    if (!session) return;
    const caps = {
      camera: !!navigator.mediaDevices?.getUserMedia, microphone: !!navigator.mediaDevices?.getUserMedia,
      fullscreen: !!document.documentElement.requestFullscreen, clipboardBlocking: true, visibilityMonitor: true,
      faceDetection: !!window.FaceDetector, phoneDetection: false, voiceMonitoring: session.format !== "LISTEN_REPEAT" && !!window.AudioContext,
      dynamicWatermark: true, secureExamMode: !!(window as any).__SECURE_EXAM_MODE__, userAgent: navigator.userAgent,
      metadata: { screen: `${window.screen.width}x${window.screen.height}`, platform: navigator.platform, sessionId: session.sessionId }
    };
    recordSecurityCapabilities(caps).catch(() => {});
  }, [session]);

  useEffect(() => {
    assessmentService
      .getStatus()
      .then((status) => {
        if (status.status === "NOT_STARTED") {
          navigate("/candidate/system-check");
        } else if (status.status !== "IN_PROGRESS") {
          navigate("/candidate/result");
        } else {
          void loadCurrentSession();
        }
      })
      .catch(() => void loadCurrentSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => void loadCurrentSession(), RESYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadCurrentSession]);

  const globalRemaining = useCountdown(session?.globalRemainingSeconds);
  const sessionRemaining = useCountdown(session?.sessionRemainingSeconds);

  const handleAnswered = (questionId: string, answer: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const others = prev.yourAnswers.filter((a) => a.questionId !== questionId);
      return { ...prev, yourAnswers: [...others, { questionId, answer }] };
    });
  };

  const handleRun = (questionId: string) => {
    setRunQuestionIds((prev) => new Set(prev).add(questionId));
  };

  const handleComplete = async () => {
    if (!session || completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    setError(null);
    try {
      const status = await assessmentService.completeSession(session.sessionId);
      if (status.status !== "IN_PROGRESS") {
        navigate("/candidate/result");
      } else {
        await loadCurrentSession();
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't complete this session");
    } finally {
      setCompleting(false);
      completingRef.current = false;
    }
  };

  const handleProctoringTerminated = useCallback(() => {
    navigate("/candidate/result");
  }, [navigate]);

  const questionIds = useMemo(() => {
    if (!session) return [];
    if (session.format === "MCQ" || session.format === "LISTEN_REPEAT") return session.questions.map((q) => q.id);
    if (session.format === "CODING") return session.codingQuestions.map((q) => q.id);
    return [];
  }, [session]);

  const isAnswered = useCallback(
    (id: string) => {
      if (!session) return false;
      if (session.format === "MCQ") return session.yourAnswers.some((a) => a.questionId === id);
      if (session.format === "CODING") return runQuestionIds.has(id);
      if (session.format === "LISTEN_REPEAT") return session.audioResponses.some((a) => a.questionId === id);
      return false;
    },
    [session, runQuestionIds]
  );

  const totalQuestions = questionIds.length;
  const currentIndex = totalQuestions > 0 ? Math.min(index, totalQuestions - 1) : 0;
  const isFirst = currentIndex === 0;
  const isLast = totalQuestions > 0 && currentIndex === totalQuestions - 1;
  const canComplete = totalQuestions > 0 && questionIds.every((id) => isAnswered(id));

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => {
    const currentId = questionIds[currentIndex];
    if (currentId && !isAnswered(currentId)) {
      setSkippedIds((prev) => new Set(prev).add(currentId));
    }
    setIndex((i) => Math.min(totalQuestions - 1, i + 1));
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading your assessment…</div>;
  }
  if (!session) {
    return <div className="flex h-screen items-center justify-center text-slate-500">{error ?? "No active session"}</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">
              Session {session.sessionNumber}/8 · {SESSION_LABELS[session.sessionType] ?? session.sessionType}
            </p>
            <p className="text-xs text-slate-500">{session.totalMarks} marks</p>
          </div>
          <div className="flex gap-6 text-right text-sm">
            {session.sessionRemainingSeconds !== undefined && (
              <div>
                <p className="text-xs text-slate-500">Session time</p>
                <p className="font-mono font-medium text-slate-900">{formatSeconds(sessionRemaining)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500">Total time</p>
              <p className="font-mono font-medium text-slate-900">{formatSeconds(globalRemaining)}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">
          {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div
            className={`relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
              session.format === "CODING" ? "max-w-6xl p-8" : "max-w-3xl p-10"
            }`}
          >
            <DynamicWatermark contained name={user?.name} email={user?.email} />
            <div className="relative z-10">
              {session.format === "MCQ" && (
                // Cast is safe: this branch only ever runs when format === "MCQ",
                // at which point every row in `questions` is a full McqQuestion
                // (see backend's format-aware getSanitizedSessionQuestions).
                // The union type on CurrentSessionResponse.questions exists so
                // LISTEN_REPEAT rows can never carry a `question` sentence field.
                <McqQuestionPanel
                  sessionId={session.sessionId}
                  question={session.questions[currentIndex] as McqQuestion}
                  index={currentIndex}
                  selectedAnswer={
                    session.yourAnswers.find((a) => a.questionId === session.questions[currentIndex]?.id)?.answer
                  }
                  onAnswered={handleAnswered}
                />
              )}
              {session.format === "CODING" && (
                <CodingQuestionCard
                  key={session.codingQuestions[currentIndex]?.id}
                  sessionId={session.sessionId}
                  question={session.codingQuestions[currentIndex]}
                  index={currentIndex}
                  onRun={handleRun}
                />
              )}
            </div>
          </div>

          <div className={`mx-auto mt-6 flex justify-between ${session.format === "CODING" ? "max-w-6xl" : "max-w-3xl"}`}>
            {!isFirst ? (
              <button
                onClick={goPrev}
                className="rounded-md border border-slate-300 bg-white px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </button>
            ) : (
              <span />
            )}
            {!isLast ? (
              <button onClick={goNext} className="rounded-md bg-slate-900 px-6 py-2.5 font-medium text-white hover:bg-slate-800">
                Next →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!canComplete || completing}
                className="rounded-md bg-slate-900 px-8 py-2.5 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {completing ? "Submitting…" : "Complete Session"}
              </button>
            )}
          </div>
          {isLast && !canComplete && (
            <p className={`mx-auto mt-2 text-right text-xs text-slate-500 ${session.format === "CODING" ? "max-w-6xl" : "max-w-3xl"}`}>
              {session.format === "MCQ"
                ? "Answer every question to continue."
                : "Press Run on every question to continue."}
            </p>
          )}
        </main>

        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          <ProctoringMonitor onTerminated={handleProctoringTerminated} enableVoiceMonitoring={session.format !== "LISTEN_REPEAT"} size="large" />
          <div className="mt-4">
            <SessionProgress
              sessionNumber={session.sessionNumber}
              sessionLabel={SESSION_LABELS[session.sessionType] ?? session.sessionType}
              total={totalQuestions}
              currentIndex={currentIndex}
              isAnswered={(i) => isAnswered(questionIds[i])}
              isSkipped={(i) => skippedIds.has(questionIds[i])}
            />
          </div>
          <div className="mt-4">
            <SessionInstructionsPanel sessionType={session.sessionType} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function SessionProgress({
  sessionNumber,
  sessionLabel,
  total,
  currentIndex,
  isAnswered,
  isSkipped,
}: {
  sessionNumber: number;
  sessionLabel: string;
  total: number;
  currentIndex: number;
  isAnswered: (index: number) => boolean;
  isSkipped: (index: number) => boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Session {sessionNumber} · {sessionLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const answered = isAnswered(i);
          const skipped = !answered && isSkipped(i);
          const active = i === currentIndex;
          const colorClass = answered
            ? "border-emerald-500 bg-emerald-500 text-white"
            : skipped
              ? "border-red-500 bg-red-500 text-white"
              : "border-slate-300 bg-white text-slate-500";
          return (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${colorClass} ${
                active ? "ring-2 ring-slate-900 ring-offset-1" : ""
              }`}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}