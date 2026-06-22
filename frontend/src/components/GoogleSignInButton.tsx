import { useEffect, useRef, useState } from "react";

type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  clientId,
  theme,
  onCredential
}: {
  clientId: string;
  theme: "light" | "dark";
  onCredential: (token: string, nonce: string) => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    void initialize();
    return () => { active = false; };

    async function initialize() {
      try {
        await loadGoogleIdentityScript();
        const google = window.google;
        const container = containerRef.current;
        if (!active || !google || !container) return;
        const { nonce, hashedNonce } = await createNonce();
        if (!active) return;
        google.accounts.id.initialize({
          client_id: clientId,
          context: "signin",
          ux_mode: "popup",
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async (response: CredentialResponse) => {
            if (!response.credential) {
              setErrorMessage("Google did not return a sign-in credential.");
              return;
            }
            setErrorMessage("");
            try {
              await onCredential(response.credential, nonce);
            } catch (error) {
              setErrorMessage(getErrorMessage(error));
            }
          }
        });
        container.replaceChildren();
        google.accounts.id.renderButton(container, {
          type: "standard",
          shape: "pill",
          theme: theme === "dark" ? "filled_black" : "outline",
          text: "signin_with",
          size: "large",
          logo_alignment: "left",
          width: 240
        });
      } catch (error) {
        if (active) setErrorMessage(getErrorMessage(error));
      }
    }
  }, [clientId, onCredential, theme]);

  return (
    <div className="google-sign-in-wrap">
      <div id="google-sign-in" className="google-sign-in-host" ref={containerRef} />
      {errorMessage ? <span className="form-message small">{errorMessage}</span> : null}
    </div>
  );
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityScript() {
  if (window.google) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing || document.createElement("script");
    const handleLoad = () => resolve();
    const handleError = () => reject(new Error("Could not load Google sign-in."));
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return googleScriptPromise;
}

async function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { nonce, hashedNonce };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Could not sign in with Google.";
}
