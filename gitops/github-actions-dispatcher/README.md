# GitOps update via `repository_dispatch`

This directory contains **two separate repository templates**:

- `app-repo/` - builds and pushes an image, then emits a GitHub `repository_dispatch` event
- `gitops-repo/` - receives the event, updates its own manifest, and commits the change

The key design point is that the application repository **never clones or edits the GitOps repository**. It only publishes an event with deployment metadata.

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

## Why this is better than mutating the GitOps repo from the app repo

Compared with:

```text
app repo
    |- clone gitops repo
    |- edit
    |- commit
    `- push
```

this pattern keeps responsibilities cleaner:

- **Separation of responsibilities** - the app repository publishes build output; the GitOps repository owns deployment-state changes.
- **GitOps repository owns its own mutations** - commit logic, paths, validation, and branching rules stay local to the GitOps repo.
- **Application repository is unaware of GitOps layout** - it only sends metadata such as image and tag.
- **Centralized GitOps update logic** - one workflow can enforce the same mutation policy for many app repos.
- **Easier GitOps evolution** - the GitOps repo can change file locations, templating, or promotion logic without changing every application repo.

## Using these templates

1. Create one GitHub repository from `app-repo/`.
2. Create another GitHub repository from `gitops-repo/`.
3. Follow the README in each directory to configure secrets, variables, and permissions.
