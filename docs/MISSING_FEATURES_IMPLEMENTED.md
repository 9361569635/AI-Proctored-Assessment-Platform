# Missing-feature implementation pass

This pass adds the previously incomplete areas: browser voice-anomaly monitoring, dynamic moving watermark, security-capability persistence, stronger proctoring event types, production configuration guards, readiness health endpoint, global rate limiting, audit logging for proctoring, integration smoke coverage, CI dependency scanning, and an optional Secure Exam Electron kiosk shell.

## Important limitations
- A normal browser cannot physically prevent a phone camera outside the monitor. Phone detection requires an ML detector and webcam visibility; this build records the capability and uses proctoring events where detections are wired.
- The optional desktop shell improves lockdown but is not a universal OS anti-cheat guarantee.
- Real communication STT still requires `SPEECH_PROVIDER=openai` and `SPEECH_API_KEY`.
