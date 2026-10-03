import { apiFetch, apiFetchBlob } from "./apiClient";

/**
 * Uploads the candidate's pre-assessment verification photo. Called once
 * from the Consent page before Start Assessment is enabled. The backend is
 * expected to store this against the candidate's profile so it can be
 * fetched again during any assessment session (see fetchCandidatePhoto)
 * and persists across refreshes since it's server-stored, not kept only in
 * frontend state.
 *
 * ASSUMED endpoint shape — POST /candidate/photo, multipart field "photo".
 * This mirrors the existing /audio/session/.../submit pattern, but I
 * haven't seen your candidate-profile backend files (candidate.controller.ts
 * / candidate.routes.ts), so this needs to be confirmed/implemented there.
 */
export const submitCandidatePhoto = (blob: Blob) => {
  const formData = new FormData();
  formData.append("photo", blob, "candidate-photo.jpg");
  return apiFetch<{ ok: true }>(`/candidate/photo`, {
    method: "POST",
    body: formData,
  });
};

/**
 * Fetches the candidate's captured photo as image bytes, for display in the
 * assessment header. ASSUMED endpoint — GET /candidate/photo. Same caveat
 * as above: needs a real backend route to back it.
 */
export const fetchCandidatePhoto = () => apiFetchBlob(`/candidate/photo`);