"use client";

import { useState } from "react";

const EMAIL = "info@aeroparkdirect.co.uk";
const SUBJECT = "New project";

/**
 * A mailto: link alone looks broken to anyone without a desktop mail client
 * configured — nothing visibly happens on click. This still tries mailto:
 * (so it opens normally for people who do have one) but always copies the
 * address too, and swaps the label to a confirmation for a moment — so the
 * click always has a visible result either way.
 */
export default function MailCta({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      /* clipboard unavailable — mailto: below is still the real action */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <a
      className={className}
      href={`mailto:${EMAIL}?subject=${encodeURIComponent(SUBJECT)}`}
      onClick={handleClick}
    >
      {copied ? `Copied — ${EMAIL}` : children}
    </a>
  );
}
