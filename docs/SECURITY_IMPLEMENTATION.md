# Security implementation

Implemented in this pass:

- Moving dynamic watermark on every assessment page.
- Browser microphone RMS anomaly monitor, disabled during the listen-and-repeat session so the candidate's intentional speech is not flagged as background voice.
- Escalating `VOICE_ANOMALY`, `PHONE_OR_DEVICE_DETECTED`, `SUSPICIOUS_GAZE`, and `CAPABILITY_FAILURE` event policies.
- Persistent security capability record per assessment attempt.
- Global API rate limiting and production configuration guards.
- `/health/ready` database readiness endpoint.
- Audit logging for proctoring events.
- CI dependency audit.
- Optional Electron Secure Exam kiosk shell.

Not claimed as guaranteed by browser APIs:

- A physical phone outside the webcam frame cannot be prevented by a website.
- Browser APIs cannot universally disable screenshots, OS shortcuts, external monitors, or other applications.
- Reliable ML phone/face detection needs a model runtime and model assets; the browser fallback remains best-effort rather than pretending unsupported browsers are protected.

For production, use the Secure Exam Desktop shell on managed devices together with webcam proctoring and organizational device controls.
