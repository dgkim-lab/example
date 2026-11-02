# Google Authenticator 2FA sample app

A small Next.js + PostgreSQL demo using password authentication and TOTP codes from Google Authenticator (or any compatible authenticator app).

## Run locally

```bash
cp .env.example .env
cd dependency && docker compose up -d && cd ..
npm install
npm run db:push
npm run dev
```

Open <http://localhost:3000>, create an account, open **Set up 2FA**, scan the QR code in Google Authenticator, and verify the six-digit code. The protected page then requires a fresh code after the password session is established.

The secret is stored with the user record for this intentionally small demo. Production applications should encrypt secrets at rest, add rate limiting/recovery codes, protect enrollment and login against CSRF, and use HTTPS with a strong `SESSION_SECRET`.
