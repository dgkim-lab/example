"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Verify() {
  const [error, setError] = useState("");
  const router = useRouter();
  async function verify() {
    try {
      const o = await (
        await fetch("/api/webauthn/authenticate/options")
      ).json();
      const c = await startAuthentication({ optionsJSON: o });
      const r = await fetch("/api/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(c),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      router.push("/secure");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    }
  }
  return (
    <>
      <h1>Verify your YubiKey</h1>
      <div className="card">
        <p>This page requires your registered security key.</p>
        <button onClick={verify}>Verify YubiKey</button>
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
