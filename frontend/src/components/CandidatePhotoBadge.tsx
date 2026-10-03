import { useEffect, useState } from "react";
import { fetchCandidatePhoto } from "../services/photo.service";

/**
 * The candidate's pre-assessment verification photo, shown in the header
 * (top-right, next to Total time) throughout every session 1–8. Fixed
 * physical size per spec: 45mm x 35mm — using CSS's native `mm` unit
 * directly rather than converting to px, since browsers support absolute
 * length units natively.
 */
export function CandidatePhotoBadge() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchCandidatePhoto()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // No photo available (fetch hiccup, or an older in-progress session
        // predating this feature) — fail silently rather than breaking the
        // header for everything else.
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!url) return null;

  return (
    <img
      src={url}
      alt="Candidate verification photo"
      className="rounded border border-slate-300 object-cover"
      style={{ width: "45mm", height: "35mm" }}
    />
  );
}