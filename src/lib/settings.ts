const BAULEITER_EMAIL_KEY = "aether.bauleiterEmail";

export function getBauleiterEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(BAULEITER_EMAIL_KEY) ?? "";
}

export function setBauleiterEmail(email: string): void {
  if (typeof window === "undefined") return;
  if (email.trim()) {
    window.localStorage.setItem(BAULEITER_EMAIL_KEY, email.trim());
  } else {
    window.localStorage.removeItem(BAULEITER_EMAIL_KEY);
  }
}