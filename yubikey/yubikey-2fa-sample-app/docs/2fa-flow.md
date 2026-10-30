# YubiKey 2FA flow

This diagram shows the application’s password-first login flow and WebAuthn/FIDO2 verification with a YubiKey.

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant App as Next.js app
    participant DB as PostgreSQL
    participant Key as YubiKey

    User->>Browser: Sign up with email and password
    Browser->>App: POST /api/auth/signup
    App->>DB: Store password hash and user
    App-->>Browser: Create login session

    User->>Browser: Open Register 2FA
    Browser->>App: GET registration options
    App->>DB: Load user's registered credentials
    App-->>Browser: WebAuthn challenge and options
    Browser->>Key: Create credential
    User->>Key: Touch YubiKey
    Key-->>Browser: Credential ID and attestation
    Browser->>App: POST registration response
    App->>DB: Store credential ID, public key, and counter
    App-->>Browser: YubiKey registered

    User->>Browser: Log in with email and password
    Browser->>App: POST /api/auth/login
    App->>DB: Verify password hash
    App-->>Browser: Create login session

    User->>Browser: Open protected page
    Browser->>App: Request protected page
    App-->>Browser: Request YubiKey verification
    Browser->>App: GET authentication options
    App->>DB: Load user's credentials
    App-->>Browser: WebAuthn challenge and options
    Browser->>Key: Request assertion
    User->>Key: Touch YubiKey
    Key-->>Browser: Signed assertion
    Browser->>App: POST authentication response
    App->>DB: Verify public key and update counter
    App-->>Browser: Grant access to protected page
```

## Stored 2FA data

The application stores the YubiKey credential identifier, public key, signature counter, and supported transports in `webauthn_credentials`. It never stores the private key; that remains protected by the YubiKey.
