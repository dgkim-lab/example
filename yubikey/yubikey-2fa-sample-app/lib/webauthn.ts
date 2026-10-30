import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
} from "@simplewebauthn/server";
import { db } from "./db";

export const rpID = process.env.RP_ID || "localhost";
export const origin = process.env.ORIGIN || "http://localhost:3000";

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
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function authenticationOptions(userId: string) {
  const credentials = await db.webAuthnCredential.findMany({
    where: { userId },
  });
  return generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      transports: c.transports as any,
    })),
  });
}
