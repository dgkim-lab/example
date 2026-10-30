import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const verified = request.cookies.get("twoFactorVerified")?.value;

  if (verified !== "1") {
    return NextResponse.redirect(new URL("/secure/verify", request.url));
  }

  // Treat the verification as a one-time grant. The current request can use it,
  // but the next request to /secure must require another YubiKey assertion.
  const response = NextResponse.next();
  response.cookies.delete("twoFactorVerified");
  return response;
}

export const config = {
  matcher: "/secure",
};
