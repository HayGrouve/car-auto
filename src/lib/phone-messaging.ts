/**
 * Normalize Bulgarian numbers for chat deep links (e.g. 088... → +35988...).
 */
export function formatBulgariaPhoneE164(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    const d = trimmed.replace(/\D/g, "");
    return d.length >= 10 ? `+${d}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.startsWith("359") && digits.length >= 11) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length >= 9) {
    return `+359${digits.slice(1)}`;
  }
  if (digits.length >= 9) {
    return `+${digits}`;
  }
  return null;
}

export function whatsappSendUrl(e164: string, message: string): string {
  const num = e164.replace(/^\+/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/** Primary: open chat. Message may need to be pasted if the client ignores `text`. */
export function viberChatUrl(e164: string, message: string): string {
  const digits = e164.replace(/^\+/, "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `viber://forward?number=+${digits}&text=${text}`;
}
