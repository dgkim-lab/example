# TOTP

TOTP (Time-based One-Time Password) generates a short-lived code from a shared secret and the current time. Google Authenticator is a TOTP client.

## How it works

1. During enrollment, the server creates a random secret and encodes it in an `otpauth://` URI.
2. The user scans the URI’s QR code with Google Authenticator.
3. Both the server and the app calculate the current 30-second time counter:

   ```text
   counter = floor(unix_time / 30)
   ```

4. They calculate an HMAC-SHA1 digest using the shared secret and counter.
5. Dynamic truncation converts the digest into a six-digit code.
6. The server accepts the code only if it matches the current time step. This sample also accepts one adjacent step to tolerate small clock differences.

The server never receives the generated code from Google. It independently computes the expected value and compares it with the submitted code.

## Security notes

- The shared secret is the credential. Anyone who obtains it can generate valid codes.
- Store secrets securely and never log QR codes, `otpauth://` URIs, or secrets.
- Use HTTPS, rate-limit verification attempts, and provide recovery codes for real applications.
- TOTP is resistant to password reuse but is still vulnerable to phishing because users type the code into a website.
