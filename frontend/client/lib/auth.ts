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
  // Account-level onboarding state (Postgres, not localStorage) — set
  // via setBranch()/setUsername() below and gated on by ProtectedRoute
  // in App.tsx, so it follows the account across devices/browsers.
  branch: string;
  username: string;
  onboardingComplete: boolean;
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/auth`;

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

// --- Onboarding (branch + username) -----------------------------------
//
// Both are persisted on the account server-side (see
// backend/internal/api/profile.go), not the browser, so they follow the
// user to any device/browser they sign in from.

const PROFILE_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/profile`;

/** Sets the account's branch (e.g. "Computer Science") — onboarding step 1. */
export async function setBranch(branch: string): Promise<void> {
  await jsonFetch(`${PROFILE_BASE}/branch`, {
    method: "POST",
    body: JSON.stringify({ branch }),
  });
}

/**
 * Claims a unique username for the account — onboarding step 2. Throws
 * with a user-facing message (e.g. "that username is already taken")
 * on conflict or invalid format.
 */
export async function setUsername(username: string): Promise<void> {
  await jsonFetch(`${PROFILE_BASE}/username`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}
