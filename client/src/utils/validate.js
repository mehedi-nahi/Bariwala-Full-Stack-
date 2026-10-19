export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const BD_MOBILE_RE = /^01[3-9][0-9]{8}$/;

export const digitsOnly = (value, max) => String(value).replace(/\D/g, "").slice(0, max);

// 0 (empty) … 4 (strong) – only used for the visual strength meter on sign-up.
export const passwordStrength = (pw) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
    return Math.max(1, score);
};

export const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
export const STRENGTH_COLOR = ["transparent", "#c0392b", "#d98a00", "#4c9a2a", "#1b7a4a"];
