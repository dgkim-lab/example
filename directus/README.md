# Directus self-hosted demo

This is a small local Directus instance backed by SQLite. Data, uploads, and
extensions are persisted in this directory and are ignored by Git.

## Start

```bash
cd directus
docker compose up -d
```

Open <http://localhost:8055> and sign in with:

- Email: `admin@example.com`
- Password: `directus-demo-change-me`

Swagger UI is available at <http://localhost:8080>. It loads the dynamic
OpenAPI document from Directus at `/server/specs/oas`.

Follow the container logs with `docker compose logs -f directus`.

## Stop

```bash
docker compose down
```

To remove the demo data too, delete `database/`, `uploads/`, and `extensions/`.
