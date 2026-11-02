"use client";
import { useEffect, useState } from "react";

export default function TwoFA() {
  const [setup, setSetup] = useState<{ secret: string; qrCode: string }>();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/totp/enroll").then(async (r) => setSetup(await r.json())); }, []);
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const r = await fetch("/api/totp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await r.json();
    if (!r.ok) return setError(data.error);
    setMessage("Google Authenticator is configured successfully.");
  }
  return <><h1>Set up 2FA</h1><div className="card">
    <p>Scan this QR code with Google Authenticator, then enter the six-digit code it shows.</p>
    {setup?.qrCode && <img src={setup.qrCode} alt="Google Authenticator setup QR code" width={220} height={220} />}
    {setup?.secret && <p>Can&apos;t scan? Enter this key manually: <code>{setup.secret}</code></p>}
    <form onSubmit={verify}><label>Authenticator code</label><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /><button>Verify and enable 2FA</button></form>
    {message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}
  </div></>;
}
