import { NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { getUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { origin, rpID } from "@/lib/webauthn";
export async function POST(req: Request) {
  const id = await getUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const requestCookies = (await import("next/headers")).cookies;
    const challenge = (await requestCookies()).get("webauthnChallenge")?.value;
    if (!challenge) throw new Error("Registration challenge expired.");
    const body = await req.json();
    const result = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!result.verified || !result.registrationInfo)
      throw new Error("Could not verify security key.");
    const { credential } = result.registrationInfo;
    await db.webAuthnCredential.create({
      data: {
        id: credential.id,
        userId: id,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
      },
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.delete("webauthnChallenge");
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Registration failed" },
      { status: 400 },
    );
  }
}
