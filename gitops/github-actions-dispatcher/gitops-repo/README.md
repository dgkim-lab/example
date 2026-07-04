# gitops-repo

This repository receives `repository_dispatch` events, updates its own deployment manifest, commits the change, and pushes it to `main`.

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

- `apps/sample-app/values.yaml` - manifest values updated by the workflow
- `.github/workflows/update-image.yml` - receives the dispatch event and mutates this repository
- `.env.example` - documents the values used in the example

## Required repository settings

No extra secret is required for the mutation step when pushing back to the same repository. The built-in `GITHUB_TOKEN` is enough as long as workflow permissions allow writes.

## Workflow permissions

The workflow uses:

- `contents: write` - required to commit and push the manifest update

## Expected dispatch payload

```json
{
  "app": "sample-app",
  "image": "ghcr.io/example/sample-app",
  "tag": "<git-sha>",
  "environment": "dev"
}
```

## Sample commit messages

- `chore(sample-app): deploy 4f3f2c1 to dev`
- `chore(sample-app): deploy 1a2b3c4 to dev`

## Where Argo CD fits

Argo CD would typically watch the `main` branch of this repository and reconcile the path containing `apps/sample-app/`. After this workflow pushes a new commit, Argo CD detects the Git change and applies the updated image tag to the cluster.

## Why this repository owns the mutation

This pattern is preferable to letting the application repository clone and edit GitOps files directly because:

- **Separation of responsibilities** - deployment state changes happen where deployment state lives.
- **GitOps repository owns its own mutations** - this workflow controls file paths, branch strategy, and commit messages.
- **Application repository is unaware of GitOps layout** - the app only sends deployment metadata.
- **Centralized GitOps update logic** - the same workflow can handle many application repositories.
- **Easier to evolve GitOps repository structure** - you can move or refactor manifests without touching producer repositories.
