import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { db } from "./db";

export const rpID = process.env.RP_ID || "localhost";
export const origin = process.env.ORIGIN || "http://localhost:3000";
const configuredUserVerification = process.env.WEBAUTHN_USER_VERIFICATION;
export const userVerification: "discouraged" | "preferred" | "required" =
  configuredUserVerification === "preferred" ||
  configuredUserVerification === "required"
    ? configuredUserVerification
    : "discouraged";

export async function registrationOptions(userId: string, email: string) {
  const credentials = await db.webAuthnCredential.findMany({
    where: { userId },
  });
  return generateRegistrationOptions({
    rpName: process.env.RP_NAME || "YubiKey 2FA Demo",
    rpID,
    userName: email,
    userDisplayName: email,
    attestationType: "none",
    excludeCredentials: credentials.map((c) => ({
      id: c.id,
      transports: c.transports as any,
    })),
    // Older YubiKeys may support touch/user presence but not FIDO2 PIN-based
    // user verification. Touch-only credentials are valid for this demo.
    authenticatorSelection: {
      residentKey: "discouraged",
      userVerification,
    },
  });
}

export async function authenticationOptions(userId: string) {
  const credentials = await db.webAuthnCredential.findMany({
    where: { userId },
  });
  return generateAuthenticationOptions({
    rpID,
    userVerification,
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      transports: c.transports as any,
    })),
  });
}
