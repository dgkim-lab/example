import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/session";
export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await db.user.findUnique({
    where: { email: String(email).toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash)))
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  await setSession(user.id);
  return NextResponse.json({ ok: true });
}
