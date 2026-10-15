/**
 * Client-side form validation for the auth screens.
 *
 * Mirrors the server rules in src/lib/auth/password.ts and the auth endpoints.
 * The server remains authoritative; these checks exist to give immediate
 * feedback rather than to enforce anything.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Deliberately permissive: rejects only addresses that are clearly malformed. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Email wajib diisi.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return "Format email tidak valid.";
  if (value.length > 254) return "Email terlalu panjang.";
  return null;
}

export function validateName(name: string): string | null {
  const value = name.trim();
  if (!value) return "Nama wajib diisi.";
  if (value.length < 2) return "Nama minimal 2 karakter.";
  if (value.length > 80) return "Nama maksimal 80 karakter.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password wajib diisi.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password harus memuat huruf dan angka.";
  }
  return null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

/**
 * Cheap heuristic strength meter. Weighted toward length because that is what
 * actually raises offline cracking cost against a memory-hard hash.
 */
export function scorePassword(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["", "Lemah", "Cukup", "Kuat", "Sangat kuat"] as const;
  return { score: clamped, label: labels[clamped] };
}

/** Maps a provider to a display label for the account badge. */
export function providerLabel(provider: string | undefined): string {
  if (provider === "gmail") return "Google Mail";
  if (provider === "yahoo") return "Yahoo Mail";
  return "Email";
}
