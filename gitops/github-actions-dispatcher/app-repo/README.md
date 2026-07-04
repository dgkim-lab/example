# app-repo

This repository builds a Docker image, pushes it to GHCR, and notifies the GitOps repository with `repository_dispatch`. It does **not** clone or edit the GitOps repository.

```text
Developer
    |
    v
app-repo
    |
    | GitHub Actions
    v
Build Image
    |
    v
Push GHCR
    |
    v
repository_dispatch
    |
    v
gitops-repo Workflow
    |
    v
Update values.yaml
    |
    v
Commit & Push
    |
    v
Argo CD detects change
    |
    v
Deploy to Kubernetes
```

## Files

- `app.py` - tiny HTTP server used to build a runnable container image
- `Dockerfile` - packages the app
- `.github/workflows/build.yml` - builds, pushes, and dispatches deployment metadata
- `.env.example` - documents the key values used in the example

## Required repository settings

### Actions variables

Set these in **Settings -> Secrets and variables -> Actions -> Variables**:

| Name | Example | Purpose |
| --- | --- | --- |
| `GITOPS_REPOSITORY` | `example/gitops-repo` | Target repository for the dispatch event |

### Actions secrets

Set these in **Settings -> Secrets and variables -> Actions -> Secrets**:

| Name | Example | Purpose |
| --- | --- | --- |
| `GITOPS_REPO_TOKEN` | `github_pat_...` | Fine-grained PAT with access to trigger `repository_dispatch` on the GitOps repository |

### Recommended token permissions

`GITOPS_REPO_TOKEN` should have:

- **Repository permissions -> Contents: Read and write**
- **Repository permissions -> Metadata: Read-only**
- **Repository permissions -> Actions: Read-only**

If the GitOps repository is private, ensure the token can access that repository.

## Workflow permissions

The workflow uses least-privilege repository permissions:

- `contents: read` - required by `actions/checkout`
- `packages: write` - required to push the image to GHCR

The cross-repository dispatch uses `GITOPS_REPO_TOKEN`, not the default `GITHUB_TOKEN`, because the default token cannot send events to another repository.

## Event payload

The workflow sends this shape to `gitops-repo`:

```json
{
  "app": "sample-app",
  "image": "ghcr.io/example/sample-app",
  "tag": "<git-sha>",
  "environment": "dev"
}
```

## Sample workflow outcome

- Image: `ghcr.io/<owner>/sample-app:<git-sha>`
- Event type: `image-published`
- Dispatch target: `<owner>/gitops-repo`

## Why this avoids tight coupling

This approach is preferable to having the app repo clone and edit the GitOps repo directly because:

- **Separation of responsibilities** - the app repo publishes an artifact and a deployment event.
- **GitOps repository owns its own mutations** - file paths and commit policy stay local to the GitOps repo.
- **Application repository is unaware of GitOps layout** - it does not need to know manifest locations.
- **Centralized GitOps update logic** - many applications can reuse one update workflow.
- **Easier to evolve GitOps repository structure** - manifest layout can change without changing the app workflow.

## Local run

```bash
docker build -t sample-app .
docker run --rm -p 8000:8000 sample-app
curl http://localhost:8000
```
