import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/session";
export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    password.length < 8
  )
    return NextResponse.json(
      { error: "Use a valid email and an 8+ character password." },
      { status: 400 },
    );
  if (await db.user.findUnique({ where: { email: email.toLowerCase() } }))
    return NextResponse.json(
      { error: "Email is already registered." },
      { status: 409 },
    );
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
