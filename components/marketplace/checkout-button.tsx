"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";

type CheckoutButtonProps = {
  className: string;
  fallbackHref: string;
  label: string;
  productId: string;
  returnTo?: string;
  testId?: string;
  messageClassName?: string;
};

export function CheckoutButton({
  className,
  fallbackHref,
  label,
  productId,
  returnTo,
  testId,
  messageClassName = "mt-2 text-xs text-rose-600",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: productId,
          returnTo,
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to start checkout.");
      }

      window.location.href = payload.url;
      return;
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Unable to start checkout.";
      setMessage(nextMessage);

      if (
        nextMessage.toLowerCase().includes("missing resource data") ||
        nextMessage.toLowerCase().includes("signed-in buyer access required") ||
        nextMessage.toLowerCase().includes("sign in")
      ) {
        window.location.href = fallbackHref;
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <button
        className={className}
        data-testid={testId}
        disabled={isLoading}
        onClick={() => void handleClick()}
        type="button"
      >
        {isLoading ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Starting checkout...
          </>
        ) : (
          label
        )}
      </button>
      {message ? <p className={messageClassName}>{message}</p> : null}
    </div>
  );
}
