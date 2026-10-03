import Editor from "@monaco-editor/react";
import type { CodingLanguage } from "../types/assessment";
import { CLIPBOARD_EXEMPT_CLASS } from "./ProctoringMonitor";

const MONACO_LANGUAGE: Record<CodingLanguage, string> = {
  PYTHON: "python",
  C: "c",
  CPP: "cpp",
  JAVA: "java",
  R: "r",
  SWIFT: "swift",
};

export function CodingEditor({
  language,
  value,
  onChange,
}: {
  language: CodingLanguage;
  value: string;
  onChange: (value: string) => void;
}) {
  const handleMount = (editor: any) => {
    editor.addAction({
      id: "block-external-paste", label: "Block clipboard paste", keybindings: [],
      run: () => { window.dispatchEvent(new CustomEvent("coding-paste-blocked")); }
    });
    editor.onKeyDown((e: any) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === 33) { e.preventDefault(); }
    });
    editor.onDidPaste(() => { window.dispatchEvent(new CustomEvent("coding-paste-blocked")); });
  };

  return (
    <div className={`overflow-hidden rounded-md border border-slate-300 ${CLIPBOARD_EXEMPT_CLASS}`}>
      <Editor
        height="360px"
        language={MONACO_LANGUAGE[language]}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        theme="vs"
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}

/*
 * Anti-copy/paste (spec §25-28): ProctoringMonitor's page-wide clipboard
 * blocker explicitly exempts this editor (via the CLIPBOARD_EXEMPT_CLASS
 * wrapper above) so normal typing/select/cut/copy of the candidate's own
 * code keeps working, per spec §26. What's NOT implemented: distinguishing
 * "paste from outside the browser" from "paste of a selection made inside
 * this editor" — right now, being inside this exempt zone means ALL
 * clipboard operations are allowed, including pasting external code, which
 * is the one thing §26 actually wants blocked here. Closing that gap means
 * intercepting Monaco's own paste handling directly (`editor.onDidPaste` /
 * `addCommand`) rather than relying on the document-level listener, so it
 * can inspect the pasted content's origin instead of just its target.
 */
