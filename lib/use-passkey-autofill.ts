"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { passkeyAutofillSupported } from "@/lib/passkey";

/** UM keeps a passkey ceremony for five minutes; ask for a fresh one before it lapses. */
const RENEW_MS = 4 * 60 * 1000;

export type AutofillRequest = { conditional: true; signal: AbortSignal };

const cancelled = (err: unknown) => err instanceof ApiError && err.code === "PASSKEY_CANCELLED";

/**
 * Offers the user's passkeys in the username field (WebAuthn conditional
 * mediation, um-api ADR-0010). `run` starts one ceremony with the given request
 * and resolves once it signed in. The request is renewed before UM's ceremony
 * expires, and it must be paused while a modal passkey prompt runs, because a
 * browser allows one passkey request at a time.
 */
export function usePasskeyAutofill(enabled: boolean, run: (request: AutofillRequest) => Promise<void>, onError: (err: unknown) => void) {
  const controller = useRef<AbortController | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (async () => {
      if (!(await passkeyAutofillSupported()) || !active) return;
      while (active) {
        const current = new AbortController();
        controller.current = current;
        let renewing = false;
        const renew = setTimeout(() => {
          renewing = true;
          current.abort();
        }, RENEW_MS);
        try {
          await run({ conditional: true, signal: current.signal });
          return;
        } catch (err) {
          if (!active) return;
          if (cancelled(err)) {
            if (renewing) continue;
            return; // paused for a modal prompt; resume() offers passkeys again
          }
          onError(err);
          return;
        } finally {
          clearTimeout(renew);
        }
      }
    })();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [enabled, round, run, onError]);

  const pause = useCallback(() => controller.current?.abort(), []);
  const resume = useCallback(() => setRound((r) => r + 1), []);
  return { pause, resume };
}
