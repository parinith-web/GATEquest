// Thin client for the Go auth backend. All requests use
// `credentials: "include"` so the httpOnly session cookie set by the
// server is sent automatically — there's no token to store in
// localStorage.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  hasPasskey: boolean;
  hasGoogle: boolean;
}

const API_BASE = "/api/auth";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore parse errors, use default message */
    }
    throw new Error(message);
  }
  return res.json();
}

/** Returns the logged-in user, or null if there's no valid session. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await jsonFetch<{ user: AuthUser }>(`${API_BASE}/me`);
    return data.user;
  } catch {
    return null;
  }
}

/** Redirects the whole page to Google's consent screen. */
export function loginWithGoogle() {
  window.location.href = `${API_BASE}/google/login`;
}

export async function logout(): Promise<void> {
  await jsonFetch(`${API_BASE}/logout`, { method: "POST" });
}

// --- Passkeys --------------------------------------------------------------
//
// These wrap @simplewebauthn/browser, which handles converting the
// server's JSON options into the binary ArrayBuffers the real
// navigator.credentials.create()/get() browser APIs expect, and back
// again for the response.

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";

export async function registerPasskey(
  email: string,
  name: string,
): Promise<AuthUser> {
  const options = await jsonFetch<any>(`${API_BASE}/passkey/register/begin`, {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });

  const attestation = await startRegistration({ optionsJSON: options.publicKey });

  const result = await jsonFetch<{ user: AuthUser }>(
    `${API_BASE}/passkey/register/finish`,
    { method: "POST", body: JSON.stringify(attestation) },
  );
  return result.user;
}

export async function loginWithPasskey(): Promise<AuthUser> {
  const options = await jsonFetch<any>(`${API_BASE}/passkey/login/begin`, {
    method: "POST",
  });

  const assertion = await startAuthentication({ optionsJSON: options.publicKey });

  const result = await jsonFetch<{ user: AuthUser }>(
    `${API_BASE}/passkey/login/finish`,
    { method: "POST", body: JSON.stringify(assertion) },
  );
  return result.user;
}
