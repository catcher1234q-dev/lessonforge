"use client";

import { useEffect, useRef, useState } from "react";

export const COPY_UNAVAILABLE_MESSAGE = "Copy unavailable in this browser session.";

async function writeTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

export function useCopyFeedback(timeoutMs = 2000) {
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function clearCopyTimeout() {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => clearCopyTimeout, []);

  async function copyWithFeedback({
    text,
    kind,
    value = null,
    successFeedback,
  }: {
    text: string;
    kind: string;
    value?: string | null;
    successFeedback: string;
  }) {
    clearCopyTimeout();

    try {
      await writeTextToClipboard(text);
      setCopiedKind(kind);
      setCopiedValue(value);
      setCopyFeedback(successFeedback);
      timeoutRef.current = window.setTimeout(() => {
        setCopiedKind((current) => (current === kind ? null : current));
        setCopiedValue((current) => (current === value ? null : current));
        setCopyFeedback((current) =>
          current === successFeedback ? null : current,
        );
        timeoutRef.current = null;
      }, timeoutMs);
    } catch {
      setCopiedKind(null);
      setCopiedValue(null);
      setCopyFeedback(COPY_UNAVAILABLE_MESSAGE);
    }
  }

  return {
    copiedKind,
    copiedValue,
    copyFeedback,
    copyWithFeedback,
  };
}
