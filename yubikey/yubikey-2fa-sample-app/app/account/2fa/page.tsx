"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
export default function TwoFA() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function register() {
    setError("");
    setMessage("Touch your YubiKey when prompted…");
    try {
      const o = await (await fetch("/api/webauthn/register/options")).json();
      const c = await startRegistration({ optionsJSON: o });
      const r = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(c),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setMessage("YubiKey registered successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
      setMessage("");
    }
  }
  return (
    <>
      <h1>Register 2FA</h1>
      <div className="card">
        <p>
          Register a YubiKey or other FIDO2 security key. Your password remains
          the first factor.
        </p>
        <button onClick={register}>Register YubiKey</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
