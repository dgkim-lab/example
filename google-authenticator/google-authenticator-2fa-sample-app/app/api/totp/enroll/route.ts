import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { createOtpAuthUri, createSecret } from "@/lib/totp";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = user.totpSecret ?? createSecret();
  if (!user.totpSecret) await db.user.update({ where: { id: userId }, data: { totpSecret: secret } });
  const uri = createOtpAuthUri(secret, user.email);
  return NextResponse.json({ secret, uri, qrCode: await QRCode.toDataURL(uri) });
}
