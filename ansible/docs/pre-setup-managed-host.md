# Managed Host Pre-Setup

Use this checklist before running Ansible against a new Ubuntu or Raspberry Pi OS host.

Replace these example values:

- `ansible` - remote automation user.
- `YOUR_PUBLIC_KEY` - your SSH public key, usually from `~/.ssh/id_ed25519.pub`.
- `vpn.example.com` - target host DNS name or IP address.

## Create Ansible User

Run on the managed host as `root` or another sudo-capable user:

```bash
sudo adduser --disabled-password --gecos "" ansible
```

## Install SSH Authorized Key

```bash
sudo install -d -m 700 -o ansible -g ansible /home/ansible/.ssh
echo 'YOUR_PUBLIC_KEY' | sudo tee -a /home/ansible/.ssh/authorized_keys
sudo chown ansible:ansible /home/ansible/.ssh/authorized_keys
sudo chmod 600 /home/ansible/.ssh/authorized_keys
```

Validate login from the Ansible control machine:

```bash
ssh ansible@vpn.example.com
```

## Configure Sudo

For passwordless sudo, create a dedicated sudoers file:

```bash
echo 'ansible ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/90-ansible
sudo chmod 440 /etc/sudoers.d/90-ansible
sudo visudo -cf /etc/sudoers.d/90-ansible
```

For password-based sudo, use this instead:

```bash
sudo usermod -aG sudo ansible
```

Then run playbooks with `--ask-become-pass`.

## Install Python

Most Ubuntu and Raspberry Pi OS images already include Python 3. If not:

```bash
sudo apt update
sudo apt install -y python3
```

## Inventory Example

Set the SSH user in `inventories/dev/hosts.yml`:

```yaml
all:
  children:
    openvpn_servers:
      hosts:
        vpn.example.com:
          ansible_host: vpn.example.com
          ansible_user: ansible
```

## Validate From Control Machine

From this repository:

```bash
ansible-playbook playbooks/ping.yml
```

If sudo requires a password:

```bash
ansible-playbook playbooks/ping.yml --ask-become-pass
```

After the ping playbook succeeds, the host is ready for normal playbooks.
