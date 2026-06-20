import { useState } from "react";
import { copyText } from "./copy";

export function useCopy(label?: string) {
  const [copied, setCopied] = useState(false);
  const [modalText, setModalText] = useState<string | null>(null);
  const [modalLabel, setModalLabel] = useState<string>("Copy");

  const copy = async (text: string, lbl?: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Clipboard blocked — show modal fallback
      setModalLabel(lbl ?? label ?? "Copy");
      setModalText(text);
    }
  };

  const closeModal = () => setModalText(null);

  return { copy, copied, modalText, modalLabel, closeModal };
}
