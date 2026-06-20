import { useEffect, useRef } from "react";

interface Props {
  text: string;
  label?: string;
  onClose: () => void;
}

export default function CopyModal({ text, label = "Copy this text", onClose }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-select all text when modal opens
    if (taRef.current) {
      taRef.current.focus();
      taRef.current.select();
      taRef.current.setSelectionRange(0, text.length);
    }
  }, [text]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          border: "1px solid var(--accent)",
          padding: "20px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "var(--accent)", fontSize: "12px", letterSpacing: "0.1em", fontWeight: 700 }}>
            {label.toUpperCase()}
          </div>
          <button
            className="btn"
            onClick={onClose}
            style={{ fontSize: "10px", padding: "3px 10px", color: "var(--text-dim)", borderColor: "var(--border)" }}
          >
            ✕ CLOSE
          </button>
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: "10px" }}>
          Text is pre-selected — press <strong style={{ color: "var(--text)" }}>Ctrl+C</strong> (or ⌘C on Mac) to copy.
        </div>
        <textarea
          ref={taRef}
          readOnly
          value={text}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            color: "var(--accent)",
            fontSize: "10px",
            fontFamily: "monospace",
            lineHeight: 1.6,
            padding: "12px",
            resize: "none",
            flex: 1,
            minHeight: "300px",
            outline: "none",
          }}
          onClick={(e) => {
            const el = e.currentTarget;
            el.select();
            el.setSelectionRange(0, el.value.length);
          }}
        />
      </div>
    </div>
  );
}
