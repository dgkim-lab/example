# Terraform quick guide

This document is a short guide for using this directory.

## Install Terraform

On Ubuntu or Debian, install from HashiCorp's repository:

```sh
sudo apt-get update
sudo apt-get install -y gnupg software-properties-common
wget -O- https://apt.releases.hashicorp.com/gpg | \
  gpg --dearmor | \
  sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
https://apt.releases.hashicorp.com $(. /etc/os-release && echo "$VERSION_CODENAME") main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update
sudo apt-get install terraform
```

Verify the installation:

```sh
terraform version
```

Other systems and official installation instructions are documented by
[HashiCorp](https://developer.hashicorp.com/terraform/install).

## First run

From this directory:

```sh
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
```

`terraform.tfvars` contains environment-specific values and secrets, so it is
ignored by Git. Review `terraform plan` before confirming `terraform apply`.

To remove resources managed by this project:

```sh
terraform destroy
```

## Files in this directory

- `versions.tf` — Terraform version, provider requirements, and provider configuration for Proxmox, AWS, and MikroTik.
- `backend.tf` — S3 remote state configuration. Replace the placeholder bucket name before initialization.
- `variables.tf` — Input variable declarations, including required manual VM/container IDs and reserved IPs.
- `main.tf` — Resources: Ubuntu images, VMs, LXC containers, MikroTik DHCP leases, cloud-init snippets, and Route 53 records.
- `outputs.tf` — Values printed after apply, such as VM/container IDs and IP addresses.
- `terraform.tfvars.example` — Example variable values. Copy it to `terraform.tfvars` and edit it.
- `README.md` — Project overview and operational notes.
- `TERRAFORM.md` — This beginner-oriented Terraform guide.
- `.gitignore` — Prevents Terraform cache, state, and local secrets from being committed.

Terraform will also create these local files or directories:

- `.terraform/` — Provider plugins and Terraform working data.
- `.terraform.lock.hcl` — Provider dependency lock file; normally commit this file.
- `terraform.tfstate` — Terraform's record of managed infrastructure. It may contain secrets; do not commit it to Git. Protect it and back it up, or use a remote backend.

## How Terraform loads the files

Terraform loads all `.tf` files in the current directory as one root module.
There is no meaningful execution order based on filenames. Terraform builds a
dependency graph from references such as `var.vms` or
`proxmox_virtual_environment_vm.this`, then creates resources in dependency
order and in parallel where possible.

In this project, the logical flow is:

```text
versions.tf + variables.tf
        ↓
main.tf resources and dependencies
        ↓
outputs.tf values after apply
```

The filenames only organize the configuration for people; they do not define
the resource creation sequence.

Variable values are loaded separately. A local `terraform.tfvars` file is
automatically used. `*.auto.tfvars` files are also loaded, and explicit
`-var-file=...` arguments can be supplied when running Terraform.

## State and Git

This project uses an S3 remote backend. State is stored at the configured S3
bucket and key instead of being committed or kept as the normal local state
file. The `.gitignore` file still excludes local state as a safety measure.
State can contain passwords, tokens, IP addresses, and other sensitive values,
and Git does not provide Terraform state locking.

Commit the Terraform configuration and `.terraform.lock.hcl`, but do not commit
`terraform.tfstate`, `terraform.tfstate.backup`, `.terraform/`, saved plan files,
or secret-containing `.tfvars` files.

Create the S3 bucket separately before running `terraform init`; do not try to
create the backend bucket from this same configuration. Enable bucket
versioning, block public access, and restrict IAM permissions. The S3 backend
uses `use_lockfile = true` for state locking. If a local state file already
exists, `terraform init` will offer to migrate it to S3.

See HashiCorp's documentation for [configuration files](https://developer.hashicorp.com/terraform/language/files)
and [variable precedence](https://developer.hashicorp.com/terraform/language/values/variables).
