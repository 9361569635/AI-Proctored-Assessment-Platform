import { useEffect, useRef, useState } from "react";
import { submitCandidatePhoto } from "../services/photo.service";
import { ApiClientError } from "../services/apiClient";
 
type CaptureState = "starting-camera" | "live" | "captured" | "uploading" | "uploaded" | "error";
type PoseCheck = "straight" | "turned" | "unknown";
 
const FACE_CHECK_INTERVAL_MS = 1000;
 
declare global {
  interface Window {
    FaceDetector?: new (o?: any) => { detect: (s: CanvasImageSource) => Promise<any[]> };
  }
}
 
interface Point2D {
  x: number;
  y: number;
}
interface FaceLandmark {
  type?: string;
  locations: Point2D[];
}
interface DetectedFaceLike {
  boundingBox?: { x: number; y: number; width: number; height: number };
  landmarks?: FaceLandmark[];
}
 
/**
 * Best-effort head-pose estimate from whatever landmarks Chrome's
 * FaceDetector happens to return (support/format is inconsistent — this is
 * NOT precise pose estimation, just a rough geometric heuristic):
 *
 *  - Yaw (left/right turn): compares the nose's horizontal position to the
 *    midpoint between the two eyes, normalized by eye separation. A
 *    straight-on face has the nose roughly centered between the eyes; a
 *    turned head shifts it noticeably toward one side.
 *  - Pitch (up/down tilt), only if mouth landmarks are also present: checks
 *    whether the vertical eye-to-mouth distance, normalized by eye
 *    separation, falls within a loose "typical frontal face" band. A
 *    pitched-up/down head compresses or stretches this via foreshortening.
 *
 * Returns "unknown" whenever there isn't enough landmark data to judge at
 * all (common — many Chrome builds return an empty landmarks array even
 * when boundingBox detection succeeds) — callers should treat "unknown" as
 * a pass, not a fail, since capture would otherwise become impossible on
 * any browser/build that doesn't populate landmarks.
 */
function estimatePose(face: DetectedFaceLike): PoseCheck {
  const landmarks = face.landmarks ?? [];
  if (landmarks.length === 0) return "unknown";
 
  const eyePoints = landmarks.filter((l) => l.type === "eye").flatMap((l) => l.locations);
  const nosePoints = landmarks.filter((l) => l.type === "nose").flatMap((l) => l.locations);
  const mouthPoints = landmarks.filter((l) => l.type === "mouth").flatMap((l) => l.locations);
 
  if (eyePoints.length < 2 || nosePoints.length === 0) return "unknown";
 
  const leftEye = eyePoints.reduce((a, b) => (a.x < b.x ? a : b));
  const rightEye = eyePoints.reduce((a, b) => (a.x > b.x ? a : b));
  const eyeDist = Math.abs(rightEye.x - leftEye.x);
  if (eyeDist < 5) return "unknown"; // degenerate spread, not trustworthy
 
  const noseX = nosePoints.reduce((sum, p) => sum + p.x, 0) / nosePoints.length;
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const yawOffsetRatio = (noseX - eyeMidX) / eyeDist;
 
  // Loose on purpose — err toward allowing a genuinely-straight face
  // through rather than blocking on landmark noise.
  const YAW_THRESHOLD = 0.18;
  if (Math.abs(yawOffsetRatio) > YAW_THRESHOLD) return "turned";
 
  if (mouthPoints.length > 0) {
    const eyeMidY = (leftEye.y + rightEye.y) / 2;
    const mouthY = mouthPoints.reduce((sum, p) => sum + p.y, 0) / mouthPoints.length;
    const verticalRatio = Math.abs(mouthY - eyeMidY) / eyeDist;
    // A roughly frontal face's eye-to-mouth vertical distance is typically
    // somewhere around 0.55–1.6x its eye-to-eye horizontal distance; well
    // outside that band suggests a pitched-up/down head. Wide band on purpose.
    if (verticalRatio < 0.4 || verticalRatio > 1.6) return "turned";
  }
 
  return "straight";
}
 
/**
 * Pre-assessment photo verification, shown on the Consent page. Captures a
 * still frame from the webcam, uploads it immediately, and reports success
 * via onCaptured so the parent can gate the Start Assessment button on it.
 *
 * Capture requires BOTH a face being present AND (best-effort) facing
 * roughly straight at the camera — see estimatePose above for exactly what
 * that does and doesn't check, and its accuracy caveats. As a second
 * check, the captured still frame itself is re-verified before upload; if
 * that comes back with no face or a turned pose, the photo is rejected and
 * the camera restarts automatically for a retake — no page reload anywhere
 * in this flow, it's all local component state.
 *
 * Browsers without the FaceDetector API (most non-Chromium browsers) fail
 * open entirely — capture is allowed unconditionally — matching how
 * ProctoringMonitor.tsx already degrades, so candidates on those browsers
 * aren't blocked from starting the exam over a missing browser API.
 */
export function PhotoCapture({ onCaptured }: { onCaptured: (captured: boolean) => void }) {
  const [state, setState] = useState<CaptureState>("starting-camera");
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [poseOk, setPoseOk] = useState(false);
  const faceDetectionSupported = typeof window !== "undefined" && !!window.FaceDetector;
 
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceTimerRef = useRef<number | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
 
  const stopFaceDetection = () => {
    if (faceTimerRef.current !== undefined) {
      window.clearInterval(faceTimerRef.current);
      faceTimerRef.current = undefined;
    }
  };
 
  const startFaceDetection = () => {
    stopFaceDetection();
    if (!window.FaceDetector) {
      // No API available — fail open, never block capture on it.
      setFaceDetected(true);
      setPoseOk(true);
      return;
    }
    setFaceDetected(false);
    setPoseOk(false);
    try {
      const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
      faceTimerRef.current = window.setInterval(async () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2) return;
        try {
          const faces = await detector.detect(v);
          if (faces.length === 0) {
            setFaceDetected(false);
            setPoseOk(false);
            return;
          }
          setFaceDetected(true);
          const pose = estimatePose(faces[0] as DetectedFaceLike);
          setPoseOk(pose !== "turned"); // "straight" or "unknown" both pass
        } catch {
          // A transient detection failure shouldn't lock the candidate out —
          // just leave the last known state as-is for this tick.
        }
      }, FACE_CHECK_INTERVAL_MS);
    } catch {
      // Detector construction failed — fail open rather than block capture.
      setFaceDetected(true);
      setPoseOk(true);
    }
  };
 
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("live");
      startFaceDetection();
    } catch (err) {
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
        setError("Camera access was denied. Please allow camera permission and try again.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No camera was found. Please connect one and try again.");
      } else {
        setError("Couldn't access your camera — check permissions and try again.");
      }
      setState("error");
    }
  };
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("live");
        startFaceDetection();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
          setError("Camera access was denied. Please allow camera permission and try again.");
        } else if (err instanceof DOMException && err.name === "NotFoundError") {
          setError("No camera was found. Please connect one and try again.");
        } else {
          setError("Couldn't access your camera — check permissions and try again.");
        }
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
      stopFaceDetection();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
 
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
 
  const handleCapture = () => {
    if (!faceDetected || !poseOk) return; // guarded, but the button is already disabled for this case
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
 
    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
 
        // Defensive re-check on the still frame itself before committing to
        // it — if it comes back with no face, or a turned pose, despite the
        // live check passing a moment ago (e.g. they moved right as the
        // shutter fired), reject and go straight back to a live retake. No
        // page reload anywhere in this path — just resetting local state.
        if (window.FaceDetector) {
          try {
            const detector = new window.FaceDetector({ maxDetectedFaces: 1, fastMode: true });
            const faces = await detector.detect(canvas);
            if (faces.length === 0) {
              setError("No face detected in the captured photo — please retake with your face clearly in frame.");
              startFaceDetection();
              return;
            }
            const pose = estimatePose(faces[0] as DetectedFaceLike);
            if (pose === "turned") {
              setError("Please look straight at the camera and retake.");
              startFaceDetection();
              return;
            }
          } catch {
            // Detector failure on the still frame — fail open, proceed with upload.
          }
        }
 
        stopFaceDetection();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState("captured");
        streamRef.current?.getTracks().forEach((t) => t.stop());
 
        setState("uploading");
        setError(null);
        try {
          await submitCandidatePhoto(blob);
          setState("uploaded");
          onCaptured(true);
        } catch (err) {
          setError(err instanceof ApiClientError ? err.message : "Couldn't upload your photo — try again.");
          setState("captured");
          onCaptured(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };
 
  const handleRetake = async () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onCaptured(false);
    await startCamera();
  };
 
  const canCapture = state === "live" && faceDetected && poseOk;
 
  let statusText = "Position your face in the frame to enable capture";
  let statusOk = false;
  if (faceDetected && !poseOk) {
    statusText = "Please look straight at the camera to enable capture";
  } else if (faceDetected && poseOk) {
    statusText = "✓ Face detected — you can capture now";
    statusOk = true;
  }
 
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-slate-900">Photo Verification</h2>
      <p className="mb-3 text-sm text-slate-500">
        Capture a clear photo of your face before starting. This is used to verify your identity throughout the assessment.
      </p>
 
      <div className="mb-3 overflow-hidden rounded-lg bg-slate-900" style={{ aspectRatio: "4 / 3" }}>
        {state === "captured" || state === "uploading" || state === "uploaded" ? (
          previewUrl && <img src={previewUrl} alt="Captured preview" className="h-full w-full object-cover" />
        ) : (
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
 
      {state === "live" && faceDetectionSupported && (
        <p className={`mb-3 text-xs font-medium ${statusOk ? "text-emerald-600" : "text-amber-600"}`}>{statusText}</p>
      )}
 
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
 
      <div className="flex items-center gap-2">
        {state === "live" && (
          <button
            onClick={handleCapture}
            disabled={!canCapture}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            📷 Capture Photo
          </button>
        )}
        {state === "error" && (
          <button
            onClick={startCamera}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try Again
          </button>
        )}
        {(state === "captured" || state === "uploading" || state === "uploaded") && (
          <button
            onClick={handleRetake}
            disabled={state === "uploading"}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Retake
          </button>
        )}
        {state === "uploading" && <span className="text-sm text-slate-500">Uploading…</span>}
        {state === "uploaded" && <span className="text-sm text-emerald-600">✓ Photo verified</span>}
      </div>
    </div>
  );
}