import Link from "next/link";
import { getUserId } from "@/lib/session";

export default async function Home() {
  const userId = await getUserId();
  return (
    <>
      <h1>Google Authenticator 2FA Demo</h1>
      <p>A minimal local app for testing time-based one-time passwords.</p>
      <div className="card">
        <div className="row">
          {userId ? (
            <>
              <Link href="/account">Account</Link>
              <Link href="/account/2fa">Set up 2FA</Link>
              <Link href="/secure">2FA-protected page</Link>
            </>
          ) : (
            <>
              <Link href="/signup">Sign up</Link>
              <Link href="/login">Log in</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
