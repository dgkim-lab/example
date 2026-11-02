"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!r.ok) {
      setError((await r.json()).error);
      return;
    }
    router.push("/account");
  }
  return (
    <>
      <h1>Log in</h1>
      <form className="card" onSubmit={submit}>
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button>Log in</button>
        {error && <p className="error">{error}</p>}
      </form>
    </>
  );
}
