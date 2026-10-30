import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
export default async function Secure() {
  if (!(await getUserId())) redirect("/login");
  return (
    <>
      <h1>Protected area</h1>
      <div className="card">
        <p className="success">Your password and YubiKey were both verified.</p>
        <p>This is the page that requires 2FA.</p>
      </div>
    </>
  );
}
