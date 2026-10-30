# YubiKey 2FA sample app

A small Next.js + PostgreSQL demo using WebAuthn/FIDO2 security keys, including YubiKey registration and a page protected by a second-factor assertion.

## Run locally

```bash
cd yubikey-2fa-sample-app
cp .env.example .env

cd dependency
docker compose up -d
cd ..

npm install
npm run db:push
npm run dev
```

Open <http://localhost:3000>. Create an account, register your YubiKey from **Register 2FA**, then open the protected page.

The database compose project is intentionally separate:

```bash
cd yubikey-2fa-sample-app/dependency
docker compose up -d
```

This demo uses WebAuthn/FIDO2, not the legacy Yubico OTP validation service. Use `localhost` consistently in the browser because the configured WebAuthn relying-party ID and origin are `localhost`.

For a real deployment, replace `SESSION_SECRET`, use HTTPS, add CSRF/rate limiting/email verification/recovery codes, and review the security model before handling production accounts.
