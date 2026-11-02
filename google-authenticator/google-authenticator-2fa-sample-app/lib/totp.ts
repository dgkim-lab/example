import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function createSecret() {
  let bits = 0, value = 0, output = "";
  for (const byte of randomBytes(20)) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string) {
  let bits = 0, value = 0; const output: number[] = [];
  for (const char of input.replace(/=|\s/g, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret.");
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(output);
}

export function createOtpAuthUri(secret: string, email: string) {
  const issuer = "Google Authenticator 2FA Demo";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const counter = Math.floor(now / 1000 / 30);
  for (const offset of [-1, 0, 1]) {
    const message = Buffer.alloc(8);
    message.writeBigInt64BE(BigInt(counter + offset));
    const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
    const index = digest[digest.length - 1] & 15;
    const value = (digest.readUInt32BE(index) & 0x7fffffff) % 1_000_000;
    const expected = Buffer.from(String(value).padStart(6, "0"));
    if (timingSafeEqual(expected, Buffer.from(normalized))) return true;
  }
  return false;
}
