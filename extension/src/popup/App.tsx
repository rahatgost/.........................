/**
 * Popup (Phase 10.2).
 *
 * Shows unlock state and — if unlocked — the ranked matches for the
 * user's currently active tab. From here the user can Fill (asks the
 * active tab's content script to set the input) or Copy (writes to
 * clipboard and arms the SW's 30 s clear).
 *
 * "Unlocking" itself lives in the web app: the vault DEK is passphrase-
 * or biometric-derived and only exists after the user unlocks there.
 * The web app hands the plaintext accounts to the SW via `SYNC_VAULT`,
 * so the popup's job here is display + user-driven fill/copy.
 */

/// <reference types="chrome" />

import { useEffect, useMemo, useState } from "react";
import { normalizeHost } from "@/lib/domain-match";
// Value import proves vault-accounts still bundles for the extension.
import * as vaultAccounts from "@/lib/vault-accounts";
void vaultAccounts;

interface Match {
  id: string;
  issuer: string;
  label: string;
  score: number;
}

interface State {
  unlocked: boolean;
  accountCount: number;
  expiresAt: number;
}

function send<T = unknown>(msg: unknown): Promise<T> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => resolve(res as T));
    } catch {
      resolve({} as T);
    }
  });
}

/** Present the active tab's host without any hosting-provider noise. */
function prettyHost(host: string): string {
  if (!host) return "";
  // Strip trailing preview/production suffixes so the user sees the app's identity,
  // not the hosting provider's subdomain.
  const cleaned = host
    .replace(/\.lovable\.(app|dev)$/i, "")
    .replace(/\.vercel\.app$/i, "")
    .replace(/\.netlify\.app$/i, "")
    .replace(/^id-preview--[^.]+--/i, "")
    .replace(/^[a-f0-9-]{36}--/i, "");
  return cleaned || host;
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 6v6c0 4.5 3.2 8.4 8 9 4.8-.6 8-4.5 8-9V6l-8-3Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const [state, setState] = useState<State | null>(null);
  const [tabHost, setTabHost] = useState<string>("");
  const [tabId, setTabId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const webAppUrl = "https://hug-machine-maker.lovable.app/vault";

  useEffect(() => {
    let alive = true;

    void send<State & { ok: boolean }>({ type: "GET_STATE" }).then((res) => {
      if (alive && res?.ok) {
        setState({
          unlocked: !!res.unlocked,
          accountCount: res.accountCount ?? 0,
          expiresAt: res.expiresAt ?? 0,
        });
      }
    });

    void chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const t = tabs[0];
      const url = t?.url ?? "";
      if (alive) {
        setTabId(t?.id ?? null);
        setTabHost(normalizeHost(url));
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!state?.unlocked || !tabHost) return;
    let alive = true;
    void send<{ ok: boolean; matches?: Match[] }>({
      type: "MATCH_HOST",
      host: tabHost,
    }).then((res) => {
      if (alive && res?.ok) setMatches(res.matches ?? []);
    });
    return () => {
      alive = false;
    };
  }, [state?.unlocked, tabHost]);

  const hostLabel = useMemo(() => prettyHost(tabHost), [tabHost]);
  const version = chrome.runtime.getManifest().version;

  async function fill(m: Match) {
    if (tabId == null) return;
    const res = await send<{ ok: boolean; code?: string; error?: string }>({
      type: "GET_CODE",
      accountId: m.id,
    });
    if (!res.ok || !res.code) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        args: [res.code],
        func: (code: string) => {
          const el = document.activeElement as HTMLInputElement | null;
          if (!el || el.tagName !== "INPUT") return;
          const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(el),
            "value",
          )?.set;
          setter ? setter.call(el, code) : (el.value = code);
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        },
      });
      window.close();
    } catch {
      await copy(m, res.code);
    }
  }

  async function copy(m: Match, precomputed?: string) {
    let code = precomputed;
    if (!code) {
      const res = await send<{ ok: boolean; code?: string }>({
        type: "GET_CODE",
        accountId: m.id,
      });
      if (!res.ok || !res.code) return;
      code = res.code;
    }
    await navigator.clipboard.writeText(code).catch(() => undefined);
    if (tabId != null) {
      void send({ type: "CLIPBOARD_ARMED", tabId, accountId: m.id });
    }
    setCopied(m.id);
    setTimeout(() => setCopied((c) => (c === m.id ? null : c)), 1500);
  }

  return (
    <div className="wrap">
      <div className="brand">
        <div className="brand-left">
          <span className="brand-mark">
            <ShieldGlyph />
          </span>
          <span className="brand-word">Aegis</span>
        </div>
        <span className="pill">v{version}</span>
      </div>

      {state === null ? (
        <>
          <div className="headline">
            <h1>Connecting…</h1>
            <p className="sub">Talking to the vault service worker.</p>
          </div>
        </>
      ) : !state.unlocked ? (
        <>
          <div className="headline">
            <h1>Vault is locked</h1>
            <p className="sub">
              Open the web app, unlock, then tap <strong>Sync to browser
              extension</strong> in Security to send accounts here.
            </p>
          </div>
          <div className="status warn">
            <span className="dot" />
            Locked
          </div>
          <button
            className="btn block"
            onClick={() => chrome.tabs.create({ url: webAppUrl })}
          >
            Open vault
          </button>
        </>
      ) : (
        <>
          <div className="headline">
            <h1>{hostLabel || "Ready"}</h1>
            <p className="sub">
              {hostLabel
                ? "Matching accounts from your synced vault."
                : "Open a login page to see matching accounts."}
            </p>
          </div>

          <div className="status">
            <span className="dot" />
            Unlocked · {state.accountCount} account
            {state.accountCount === 1 ? "" : "s"}
          </div>

          {matches === null ? (
            <p className="muted">Looking for matches…</p>
          ) : matches.length === 0 ? (
            <div className="card">
              <div className="card-title">No match</div>
              <p className="muted">
                Nothing in your vault matches{" "}
                <strong>{hostLabel || "this tab"}</strong>. Open the web app to
                add a new account.
              </p>
            </div>
          ) : (
            <div className="list">
              {matches.map((m) => (
                <div key={m.id} className="matchRow">
                  <div>
                    <div className="issuer">{m.issuer}</div>
                    {m.label && <div className="label">{m.label}</div>}
                  </div>
                  <div className="actions">
                    <button
                      className="btn ghost small"
                      onClick={() => copy(m)}
                      title="Copy code (auto-clears in 30s)"
                    >
                      {copied === m.id ? "Copied" : "Copy"}
                    </button>
                    <button className="btn small" onClick={() => fill(m)}>
                      Fill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="footer">
            <button
              onClick={async () => {
                await send({ type: "LOCK" });
                setState({ ...state, unlocked: false, accountCount: 0 });
                setMatches(null);
              }}
            >
              Lock now
            </button>
            <button onClick={() => chrome.tabs.create({ url: webAppUrl })}>
              Open vault →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
