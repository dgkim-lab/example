# Google Authenticator 2FA flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant App as Next.js app
    participant DB as PostgreSQL
    participant Auth as Google Authenticator

    User->>Browser: Sign up with email and password
    Browser->>App: POST /api/auth/signup
    App->>DB: Store password hash and user
    App-->>Browser: Create login session
    User->>Browser: Open Set up 2FA
    Browser->>App: GET /api/totp/enroll
    App->>DB: Create and store TOTP secret
    App-->>Browser: QR code and otpauth URI
    Browser->>Auth: Scan QR code
    User->>Browser: Submit six-digit code
    Browser->>App: POST /api/totp/verify
    App->>DB: Load TOTP secret and validate RFC 6238 code
    App-->>Browser: Issue one-time protected-page grant
```

The app uses a 20-byte random secret, SHA-1 HMAC, six digits, and 30-second time steps, matching the common Google Authenticator defaults. Codes one time step before or after the current step are accepted to allow for small clock drift.
