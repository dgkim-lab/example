# Ansible Playbooks

Small Ansible boilerplate with a sample OpenVPN server role.

## Layout

- `ansible.cfg` - local Ansible defaults.
- `inventories/dev/hosts.yml` - example inventory.
- `group_vars/all.yml` - shared defaults.
- `playbooks/ping.yml` - connectivity smoke test.
- `playbooks/openvpn.yml` - OpenVPN server playbook.
- `roles/openvpn` - OpenVPN installation and configuration role.

## Setup

Prepare each target host first:

```bash
less docs/pre-setup-managed-host.md
```

```bash
ansible-galaxy collection install -r requirements.yml
ansible-playbook playbooks/ping.yml
```

Edit `inventories/dev/hosts.yml` and `group_vars/openvpn_servers.yml` before running OpenVPN.

```bash
ansible-playbook playbooks/openvpn.yml
```

## OpenVPN Assumptions

The OpenVPN role is written for Ubuntu and Raspberry Pi OS servers and assumes:

- Debian-family package names are available through `apt`.
- The OpenVPN systemd service is `openvpn-server@server` unless overridden.
- The VPN server hostname is managed in Route53.
- Let's Encrypt certificates are issued with Certbot DNS-01 validation through `certbot-dns-route53`.
- AWS credentials are available to Certbot on the remote host through an instance profile, environment, or standard AWS credential files.
- User authentication is delegated to LDAP through the OpenVPN LDAP auth plugin.

Do not commit real LDAP bind passwords, AWS credentials, or private keys. Store secrets in Ansible Vault or inject them from your secret manager.
