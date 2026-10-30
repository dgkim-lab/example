import { NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { getUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { origin, rpID } from "@/lib/webauthn";
import { cookies } from "next/headers";
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const challenge = (await cookies()).get("webauthnChallenge")?.value;
    if (!challenge) throw new Error("Verification challenge expired.");
    const body = await req.json();
    const credential = await db.webAuthnCredential.findFirst({
      where: { id: body.id, userId },
    });
    if (!credential)
      throw new Error("Security key is not registered for this account.");
    const result = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports as any,
      },
    });
    if (!result.verified) throw new Error("Could not verify security key.");
    await db.webAuthnCredential.update({
      where: { id: credential.id },
      data: { counter: result.authenticationInfo.newCounter },
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("twoFactorVerified", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 900,
    });
    response.cookies.delete("webauthnChallenge");
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verification failed" },
      { status: 400 },
    );
  }
}
