import { useCallback, useEffect, useRef, useState } from "react";
import * as proctoringService from "../services/proctoring.service";
import type { ProctoringEventResult } from "../services/proctoring.service";

const FACE_CHECK_INTERVAL_MS = 3500;
const VOICE_CHECK_INTERVAL_MS = 800;
const CONFIRM_FRAMES = 3;
export const CLIPBOARD_EXEMPT_CLASS = "proctoring-clipboard-exempt";

declare global {
  interface Window {
    FaceDetector?: new (o?: any) => { detect: (s: CanvasImageSource) => Promise<any[]> };
    secureExamDesktop?: {
      isSecureExamMode: true;
      platform: string;
      getDisplayCount: () => Promise<number>;
      onNativeViolation: (cb: (eventType: string, metadata?: Record<string, unknown>) => void) => () => void;
      requestExit: (reason?: string) => void;
    };
  }
}

export function ProctoringMonitor({
  onTerminated,
  enableVoiceMonitoring = true,
  size = "compact",
}: {
  onTerminated: () => void;
  enableVoiceMonitoring?: boolean;
  size?: "compact" | "large";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError,setCameraError]=useState<string|null>(null);
  const [banner,setBanner]=useState<{text:string;severity:string}|null>(null);
  const streamRef=useRef<MediaStream|null>(null);
  const voiceHits=useRef(0); const phoneHits=useRef(0); const noFaceHits=useRef(0); const multiFaceHits=useRef(0);
  const report=useCallback((eventType:string,metadata?:Record<string,unknown>,confidence?:number)=>{
    proctoringService.reportProctoringEvent(eventType,metadata,confidence).then((r:ProctoringEventResult)=>{
      if(r.severity!=="INFO") { setBanner({text:r.message,severity:r.severity}); window.setTimeout(()=>setBanner(null),5000); }
      if(r.terminated) onTerminated();
    }).catch(()=>{});
  },[onTerminated]);

  useEffect(()=>{
    let faceTimer:number|undefined; let voiceTimer:number|undefined; let audioCtx:AudioContext|undefined;
    (async()=>{
      try {
        const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true}); streamRef.current=stream;
        if(videoRef.current) videoRef.current.srcObject=stream;
        const audioTrack=stream.getAudioTracks()[0];
        if(audioTrack && enableVoiceMonitoring) {
          audioCtx=new AudioContext(); const source=audioCtx.createMediaStreamSource(new MediaStream([audioTrack])); const analyser=audioCtx.createAnalyser(); analyser.fftSize=512; source.connect(analyser);
          const data=new Uint8Array(analyser.fftSize);
          voiceTimer=window.setInterval(()=>{ analyser.getByteTimeDomainData(data); let sum=0; for(const v of data){const n=(v-128)/128;sum+=n*n;} const rms=Math.sqrt(sum/data.length); if(rms>0.075){voiceHits.current++; if(voiceHits.current>=CONFIRM_FRAMES){report("VOICE_ANOMALY",{rms:Math.round(rms*1000)/1000,source:"browser-audio-analyser"},Math.min(0.99,rms*5)); voiceHits.current=0;}} else voiceHits.current=Math.max(0,voiceHits.current-1); },VOICE_CHECK_INTERVAL_MS);
        }
        if(window.FaceDetector){ try { const detector=new window.FaceDetector({maxDetectedFaces:5,fastMode:true}); faceTimer=window.setInterval(async()=>{ const v=videoRef.current; if(!v||v.readyState<2)return; try{const faces=await detector.detect(v); if(faces.length===0){noFaceHits.current++;multiFaceHits.current=0;if(noFaceHits.current>=CONFIRM_FRAMES){report("NO_FACE",{source:"browser-face-detector"},0.9);noFaceHits.current=0;}} else if(faces.length>1){multiFaceHits.current++;noFaceHits.current=0;if(multiFaceHits.current>=CONFIRM_FRAMES){report("MULTI_FACE",{faceCount:faces.length,source:"browser-face-detector"},0.95);multiFaceHits.current=0;}} else {noFaceHits.current=0;multiFaceHits.current=0;}}catch{} },FACE_CHECK_INTERVAL_MS);}catch{} }
      } catch { setCameraError("Camera/microphone unavailable — check permissions."); }
    })();
    return()=>{if(faceTimer)clearInterval(faceTimer);if(voiceTimer)clearInterval(voiceTimer);audioCtx?.close();streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[report, enableVoiceMonitoring]);

  useEffect(()=>{
    const unsubscribe = window.secureExamDesktop?.onNativeViolation((eventType, metadata) => report(eventType, metadata));
    return () => unsubscribe?.();
  },[report]);

  useEffect(()=>{
    const visibility=()=>document.hidden&&report("TAB_SWITCH"); const blur=()=>report("WINDOW_BLUR"); const fs=()=>!document.fullscreenElement&&report("FULLSCREEN_EXIT");
    document.addEventListener("visibilitychange",visibility);window.addEventListener("blur",blur);document.addEventListener("fullscreenchange",fs);
    const onCopy=(e:ClipboardEvent)=>{const el=e.target instanceof HTMLElement&&e.target.closest(`.${CLIPBOARD_EXEMPT_CLASS}`);if(!el){e.preventDefault();report("COPY_ATTEMPT");}};
    const onPaste=(e:ClipboardEvent)=>{const el=e.target instanceof HTMLElement&&e.target.closest(`.${CLIPBOARD_EXEMPT_CLASS}`);if(!el){e.preventDefault();report("PASTE_ATTEMPT");}};
    const onCut=(e:ClipboardEvent)=>{const el=e.target instanceof HTMLElement&&e.target.closest(`.${CLIPBOARD_EXEMPT_CLASS}`);if(!el){e.preventDefault();report("CUT_ATTEMPT");}};
    const menu=(e:MouseEvent)=>{if(!(e.target instanceof HTMLElement&&e.target.closest(`.${CLIPBOARD_EXEMPT_CLASS}`)))e.preventDefault();};
    document.addEventListener("copy",onCopy);document.addEventListener("paste",onPaste);document.addEventListener("cut",onCut);document.addEventListener("contextmenu",menu);
    return()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("blur",blur);document.removeEventListener("fullscreenchange",fs);document.removeEventListener("copy",onCopy);document.removeEventListener("paste",onPaste);document.removeEventListener("cut",onCut);document.removeEventListener("contextmenu",menu);};
  },[report]);

  return size === "large" ? (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-900 shadow-sm"
        style={{ aspectRatio: "640 / 480", maxWidth: 640 }}
      >
        {cameraError ? (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-red-300">{cameraError}</span>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        )}
      </div>
      {banner && (
        <div
          className={`rounded px-2 py-1 text-xs font-medium ${
            banner.severity === "CRITICAL" || banner.severity === "VIOLATION" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {banner.text}
        </div>
      )}
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="relative h-12 w-20 overflow-hidden rounded border border-slate-300 bg-slate-900">
        {cameraError ? (
          <span className="flex h-full items-center justify-center text-[9px] text-red-300">No camera</span>
        ) : (
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        )}
      </div>
      {banner && (
        <div
          className={`max-w-xs rounded px-2 py-1 text-[10px] font-medium ${
            banner.severity === "CRITICAL" || banner.severity === "VIOLATION" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {banner.text}
        </div>
      )}
    </div>
  );
}
