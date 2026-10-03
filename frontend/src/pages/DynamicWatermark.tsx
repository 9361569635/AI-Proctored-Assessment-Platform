import { useEffect, useState } from "react";

export function DynamicWatermark({
  candidateId = "CANDIDATE",
  assessmentId = "ASSESSMENT",
  role = "Assessment",
  name,
  email,
  contained = false,
}: {
  candidateId?: string;
  assessmentId?: string;
  role?: string;
  name?: string;
  email?: string;
  contained?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 4500);
    return () => window.clearInterval(id);
  }, []);

  const containedPositions = ["left-[6%] top-[10%]", "right-[8%] top-[14%]", "left-[30%] top-[45%]", "right-[15%] bottom-[18%]", "left-[10%] bottom-[10%]"];
  const fixedPositions = ["left-4 top-24", "right-8 top-28", "left-1/3 top-1/2", "right-1/4 bottom-24", "left-12 bottom-16"];
  const positions = contained ? containedPositions : fixedPositions;
  const pos = positions[tick % positions.length];
  const stamp = new Date().toLocaleString();

  const wrapperClass = contained
    ? `pointer-events-none absolute z-0 ${pos} rotate-[-8deg] select-none whitespace-nowrap text-center text-slate-400/25`
    : `pointer-events-none fixed z-[40] ${pos} rotate-[-8deg] select-none rounded border border-slate-400/30 bg-white/20 px-2 py-1 text-[9px] leading-tight text-slate-500/45 backdrop-blur-[1px]`;

  if (contained && name && email) {
    return (
      <div aria-hidden className={wrapperClass}>
        <p className="text-base font-semibold">{name}</p>
        <p className="text-sm">{email}</p>
      </div>
    );
  }

  return (
    <div aria-hidden className={wrapperClass}>
      {candidateId} · {assessmentId}
      <br />
      {role} · {stamp}
    </div>
  );
}
