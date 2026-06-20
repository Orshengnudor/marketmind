/**
 * Robust clipboard copy — works in HTTPS, HTTP, and sandboxed iframes.
 * Returns true if copy succeeded silently, false if fallback modal is needed.
 */
export async function copyText(text: string): Promise<boolean> {
  // 1. Modern Clipboard API (HTTPS / non-sandboxed)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through
    }
  }

  // 2. execCommand fallback (HTTP / older browsers)
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) return true;
  } catch {
    // fall through
  }

  // 3. Both failed (sandboxed iframe) — signal caller to show modal
  return false;
}
