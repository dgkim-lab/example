# GoToSocial Docker Compose

This project runs **GoToSocial** and **PostgreSQL** together with Docker Compose.

It also supports **OIDC login**. GoToSocial can use a generic OpenID Connect provider, so **Keycloak**, **Google**, and **AWS Cognito** can all be used as the login source.

## Files

- `compose.yaml`: GoToSocial + PostgreSQL deployment
- `.env.example`: instance, PostgreSQL, and optional OIDC settings

## Prerequisites

1. Docker and Docker Compose
2. A public hostname for GoToSocial, for example `social.example.com`
3. HTTPS in front of GoToSocial, usually via reverse proxy

## Quick start

1. Copy the env template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set:
   - `GTS_HOST`
   - `POSTGRES_PASSWORD`
   - `PUID` / `PGID` if this machine does not use `10001:100`
   - `GTS_TRUSTED_PROXIES` if you are behind nginx/traefik/caddy
   - OIDC settings if you want external login

3. Start GoToSocial:

   ```bash
   mkdir -p data cache postgres
   docker compose up -d
   ```

The bundled PostgreSQL container initializes the `gotosocial` database with:

- database: `POSTGRES_DB`
- user: `POSTGRES_USER`
- password: `POSTGRES_PASSWORD`
- initdb args: `--locale=C.UTF-8 --encoding=UTF8`

In this test repository, both the GoToSocial and PostgreSQL containers run as the local user ID configured by `PUID` / `PGID` so files created in `./data`, `./cache`, and `./postgres` stay owned by your user.

If you change `PUID` / `PGID` after PostgreSQL has already initialized `./postgres`, start from a fresh `./postgres` directory for the cleanest result.

## Local preview on `http://localhost:8080`

If you only want to try GoToSocial locally before deploying it for real:

1. Set:
   - `GTS_HOST=localhost:8080`
   - `GTS_PROTOCOL=http`
   - `GTS_OIDC_ENABLED=false`
2. Start from fresh preview data before first launch:

   ```bash
   docker compose down --remove-orphans
   rm -rf data cache postgres
   mkdir -p data cache postgres
   docker compose up -d
   ```

3. Create a local user with the CLI and sign in at `http://localhost:8080`.

If you want to test OIDC locally instead, keep `GTS_PROTOCOL=http` and set `GTS_HOST=localhost:8080`. GoToSocial constructs the callback URL from `protocol + host`, so using only `localhost` will produce the wrong callback URI without the port.

This preview mode is **throwaway only**. GoToSocial should not be started once on `localhost/http` and later reused for a real `https://your-domain` deployment with the same database/media data.

4. Create your first user:

   ```bash
   docker compose exec gotosocial \
     /gotosocial/gotosocial admin account create \
     --username admin \
     --email admin@example.com \
     --password 'change-this-password'
   ```

5. Promote that user to admin:

   ```bash
   docker compose exec gotosocial \
     /gotosocial/gotosocial admin account promote \
     --username admin
   docker compose restart gotosocial
   ```

## OIDC support

Yes, GoToSocial supports **generic OIDC login**. When enabled, the normal local login form is replaced by the external OIDC sign-in flow.

Important behavior:

- The OIDC provider must return a unique, non-empty `email` claim on first login.
- The callback URL registered in the provider must be `https://<your-host>/auth/callback`.
- GoToSocial can auto-create the local account on first OIDC login.
- Group-based admin mapping only works when the provider exposes a `groups` claim.

## Provider notes

### Keycloak

Works well. Use the realm issuer URL, for example:

```env
GTS_OIDC_ENABLED=true
GTS_OIDC_IDP_NAME=Keycloak
GTS_OIDC_ISSUER=https://sso.example.com/realms/gotosocial
GTS_OIDC_CLIENT_ID=gotosocial
GTS_OIDC_CLIENT_SECRET=replace-me
GTS_OIDC_SCOPES=openid,email,profile,groups
GTS_OIDC_ADMIN_GROUPS=gotosocial-admins
```

In Keycloak, register the redirect URI:

```text
https://social.example.com/auth/callback
```

If you want admin mapping, make sure the client includes a `groups` claim in the ID token.

### Google

Works for login through Google's OIDC endpoints:

```env
GTS_OIDC_ENABLED=true
GTS_OIDC_IDP_NAME=Google
GTS_OIDC_ISSUER=https://accounts.google.com
GTS_OIDC_CLIENT_ID=replace-me.apps.googleusercontent.com
GTS_OIDC_CLIENT_SECRET=replace-me
GTS_OIDC_SCOPES=openid,email,profile
```

Google login is the easiest external sign-in option, but it does **not** normally provide the `groups` claim GoToSocial expects for admin-group mapping. For admin access, promote the user with the GoToSocial CLI.

### AWS Cognito

Works as a generic OIDC provider. Use the user-pool issuer URL:

```env
GTS_OIDC_ENABLED=true
GTS_OIDC_IDP_NAME=AWS Cognito
GTS_OIDC_ISSUER=https://cognito-idp.<region>.amazonaws.com/<user-pool-id>
GTS_OIDC_CLIENT_ID=replace-me
GTS_OIDC_CLIENT_SECRET=replace-me
GTS_OIDC_SCOPES=openid,email,profile
```

Register this callback URL in the Cognito app client:

```text
https://social.example.com/auth/callback
```

Cognito login is fine for authentication. For `GTS_OIDC_ADMIN_GROUPS`, verify that your tokens expose a plain `groups` claim; otherwise admin-group mapping may need claim customization on the Cognito side.

## Notes

- PostgreSQL data is stored in `./postgres`.
- GoToSocial connects to PostgreSQL at the internal Compose hostname `postgres`.
- By default, Compose publishes GoToSocial on `127.0.0.1:8080`, which fits a reverse-proxy setup.
- If you want direct public exposure instead, change `GTS_PUBLISH_IP` and `GTS_PUBLISH_PORT`, and make sure your external HTTPS setup is correct before first real use.
