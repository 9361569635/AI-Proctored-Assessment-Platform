import { useEffect, useRef, useState } from "react";

export function useCountdown(serverSeconds: number | undefined): number {
  const [remaining, setRemaining] = useState(serverSeconds ?? 0);
  const lastSynced = useRef(serverSeconds);

  useEffect(() => {
    if (serverSeconds === undefined) return;
    if (serverSeconds !== lastSynced.current) {
      setRemaining(serverSeconds);
      lastSynced.current = serverSeconds;
    }
  }, [serverSeconds]);

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}
