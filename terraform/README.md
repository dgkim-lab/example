# Terraform Proxmox VM

This scratch-pad project creates Ubuntu VMs and LXC containers on Proxmox VE using the
[`bpg/proxmox`](https://registry.terraform.io/providers/bpg/proxmox/latest)
provider. Terraform downloads an Ubuntu cloud image, creates a virtual disk,
and uses Proxmox's native cloud-init support to configure the initial user and
SSH key. LXC containers use a separate Ubuntu root filesystem template.

New to Terraform? See [TERRAFORM.md](TERRAFORM.md) for installation, file
descriptions, and the configuration loading model.

Terraform state is configured to use an S3 backend. Replace the bucket
placeholder in `backend.tf` with an existing private bucket before running
`terraform init`.

## Prerequisites

- Terraform 1.6 or newer
- Proxmox VE with a datastore that supports VM disks and ISO/image content
- A Proxmox API token with permission to download images and create/manage VMs
- An SSH public key
- A network bridge such as `vmbr0`
- AWS credentials with permission to change the selected Route 53 hosted zone
- A MikroTik RouterOS REST API user with permission to manage DHCP leases

The default VM datastore is `local-lvm`, the image datastore is `local`, and
the default network configuration is DHCP. Change these in `terraform.tfvars`
when your Proxmox installation uses different names or a static address. The
image datastore must support ISO/image content; the VM datastore must support
disk images.

## Configure credentials and variables

Copy the example file and edit it:

```sh
cp terraform.tfvars.example terraform.tfvars
$EDITOR terraform.tfvars
```

Do not commit `terraform.tfvars`; it can contain the API token. For production,
prefer injecting sensitive values through `TF_VAR_proxmox_api_token` or another
secret-management system.

The API token value uses the provider's expected format:
`user@realm!token-name=token-secret`.

AWS credentials are read using the standard AWS provider credential chain,
such as `AWS_PROFILE`, environment variables, or an instance/role identity.

The MikroTik provider uses the RouterOS REST API over HTTPS. Enable the API,
create a narrowly scoped user, and use the RouterOS HTTPS URL in
`mikrotik_host`. Do not commit `mikrotik_password` in `terraform.tfvars`.

## Managing multiple VMs

VMs are declared in the `vms` map. Each VM must have a manually chosen `vm_id`
and reserved `ip_address`. The map key is the stable Terraform identity; keep it
unchanged if you only rename a VM. Each entry can override its name, resources,
SSH key, datastore, bridge, and MAC address. The Ubuntu image is downloaded once
and reused by every VM.

Adding an entry creates a VM, changing an entry updates it, and removing an
entry destroys that VM on the next apply. See `terraform.tfvars.example` for a
complete two-VM example.

LXC containers are declared separately in the `containers` map. They also
require a manually chosen `vm_id` and reserved `ip_address`, and support their
own CPU, memory, swap, disk, MAC, DHCP lease, DNS name, and optional nesting
configuration. The container template is downloaded once and reused.

## DHCP and Route 53

The VM network is configured as DHCP, so MikroTik can assign each address.
Cloud-init installs and starts `qemu-guest-agent`; Proxmox then reports the
assigned address to Terraform. For any VM with `dns_name` set, Terraform creates
or updates an `A` record in the hosted zone specified by `route53_zone_id`.

To reserve a specific address, set `ip_address` (with CIDR notation) on that VM
or container. This value is registered on MikroTik; the guest still requests
its address through DHCP.
Terraform generates a stable locally administered MAC from the VM map key. Set
`mac_address` explicitly only when you need to control the MAC:

```hcl
worker = {
  ssh_public_key = "ssh-ed25519 AAAA..."
  ip_address     = "192.168.1.51/24"
  mac_address    = "02:00:00:00:00:51"
  dhcp_server    = "dhcp1"
}
```

Terraform registers the static lease on MikroTik before creating the VM, and
configures Proxmox with the same MAC address. This lets MikroTik assign the
requested address on the VM's first DHCP request. Every VM and container in
this project creates a static MikroTik lease from its configured `ip_address`.

Keep each VM's map key stable: changing it changes the generated MAC address
and therefore creates a new MikroTik lease identity.

Enable the **Snippets** content type on the image datastore in Proxmox, usually
`local`, because the per-VM cloud-init files are uploaded there.

Set `route53_zone_id = null`, or omit `dns_name` from individual VMs, to skip
DNS management. The same behavior applies to containers. Because DHCP
addresses can change, the Route 53 record follows the current address after a
refresh/apply. Use DHCP reservations on MikroTik if you need stable addresses.

The Proxmox datastore used for `image_datastore_id` must support `vztmpl`
content, and the container datastore must support root filesystems. Unprivileged
containers are enabled by default.

## Create the VMs

```sh
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

After apply, Terraform prints the VM ID and any IPv4 addresses reported by the
guest agent. The Ubuntu cloud image may need a short time to finish booting
before an address appears.

Connect using the configured user and private key:

```sh
ssh ubuntu@<vm-ip-address>
```

## Destroy the VM

This permanently removes the VM managed by this state:

```sh
terraform destroy
```

## Notes

- Set `proxmox_insecure = false` when the Proxmox API uses a certificate trusted
  by the machine running Terraform.
- The provider's VM IP outputs depend on the QEMU guest agent. This example
  installs and enables that agent through cloud-init so DHCP addresses can be
  discovered and used by Route 53.
- The downloaded image is managed by Terraform and will be removed when its
  resource is destroyed, subject to Proxmox datastore behavior.
