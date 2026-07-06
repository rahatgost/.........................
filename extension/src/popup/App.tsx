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
import { VAULT_CRYPTO_VERSION } from "@/lib/vault-crypto";
import { isBiometricSupported } from "@/lib/biometric";
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

export function App() {
  const [state, setState] = useState<State | null>(null);
  const [bio, setBio] = useState<boolean | null>(null);
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

    void isBiometricSupported().then((v) => alive && setBio(v));

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

  const heading = useMemo(() => {
    if (!tabHost) return "Aegis";
    return tabHost;
  }, [tabHost]);

  async function fill(m: Match) {
    if (tabId == null) return;
    const res = await send<{ ok: boolean; code?: string; error?: string }>({
      type: "GET_CODE",
      accountId: m.id,
    });
    if (!res.ok || !res.code) return;
    // Ask the content script to set the value on the focused input.
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
      <div className="row">
        <h1>{heading}</h1>
        <span className="pill">v{chrome.runtime.getManifest().version}</span>
      </div>

      {state === null ? (
        <p className="muted">Connecting…</p>
      ) : !state.unlocked ? (
        <>
          <p className="muted">
            Aegis is locked. Open the web app, unlock your vault, then
            press <em>Sync to extension</em> to send accounts here for
            the next {Math.round(5)} minutes.
          </p>
          <div className="status">
            <span className="dot warn" />
            Locked (crypto v{VAULT_CRYPTO_VERSION})
          </div>
          <div className="row">
            <span className="muted">
              Biometric{" "}
              {bio === null ? "…" : bio ? "available" : "unavailable"}
            </span>
            <button
              className="btn"
              onClick={() => chrome.tabs.create({ url: webAppUrl })}
            >
              Open vault
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="status">
            <span className="dot" />
            Unlocked · {state.accountCount} account
            {state.accountCount === 1 ? "" : "s"}
          </div>

          <div className="divider" />

          {matches === null ? (
            <p className="muted">Looking for matches…</p>
          ) : matches.length === 0 ? (
            <p className="muted">
              No matching accounts for <strong>{tabHost || "this tab"}</strong>.
            </p>
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
                      className="btn ghost"
                      onClick={() => copy(m)}
                      title="Copy code (auto-clears in 30s)"
                    >
                      {copied === m.id ? "Copied" : "Copy"}
                    </button>
                    <button className="btn" onClick={() => fill(m)}>
                      Fill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divider" />
          <div className="row">
            <button
              className="btn ghost"
              onClick={async () => {
                await send({ type: "LOCK" });
                setState({ ...state, unlocked: false, accountCount: 0 });
                setMatches(null);
              }}
            >
              Lock now
            </button>
            <button
              className="btn"
              onClick={() => chrome.tabs.create({ url: webAppUrl })}
            >
              Open vault
            </button>
          </div>
        </>
      )}
    </div>
  );
}
