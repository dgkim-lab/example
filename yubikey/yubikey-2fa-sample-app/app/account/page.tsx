import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
export default async function Account() {
  const id = await getUserId();
  if (!id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id },
    include: { credentials: true },
  });
  if (!user) redirect("/login");
  return (
    <>
      <h1>Account</h1>
      <div className="card">
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
        <p>Registered security keys: {user.credentials.length}</p>
        <div className="row">
          <Link href="/account/2fa">Manage 2FA</Link>
          <Link href="/secure">Open protected page</Link>
          <form action="/api/auth/logout" method="post">
            <button className="secondary">Log out</button>
          </form>
        </div>
      </div>
    </>
  );
}
