"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Verify() {
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const router = useRouter();
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const r = await fetch("/api/totp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    if (!r.ok) return setError((await r.json()).error);
    router.push("/secure");
  }
  return <><h1>Enter your authenticator code</h1><div className="card"><p>This page requires your Google Authenticator code.</p><form onSubmit={verify}><label>Six-digit code</label><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoFocus required value={code} onChange={(e) => setCode(e.target.value)} /><button>Verify code</button></form>{error && <p className="error">{error}</p>}</div></>;
}
