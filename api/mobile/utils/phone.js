export function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone)
    .trim()
    .replace(/[^+\d]/g, '')
    .replace(/^8/, '+7');
}

export function generateSmsCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
