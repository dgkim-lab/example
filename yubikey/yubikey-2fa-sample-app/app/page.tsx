import Link from "next/link";
import { getUserId } from "@/lib/session";

export default async function Home() {
  const userId = await getUserId();
  return (
    <>
      <h1>YubiKey 2FA Demo</h1>
      <p>A minimal local app for testing FIDO2/WebAuthn with a YubiKey.</p>
      <div className="card">
        <div className="row">
          {userId ? (
            <>
              <Link href="/account">Account</Link>
              <Link href="/account/2fa">Register 2FA</Link>
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
