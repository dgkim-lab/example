locals {
  # Locally administered, unicast MAC addresses that remain stable for each
  # Terraform map key. Set mac_address explicitly when a specific MAC is needed.
  vm_mac_addresses = {
    for key, vm in var.vms : key => coalesce(
      vm.mac_address,
      format(
        "02:%s:%s:%s:%s:%s",
        substr(md5(key), 0, 2),
        substr(md5(key), 2, 2),
        substr(md5(key), 4, 2),
        substr(md5(key), 6, 2),
        substr(md5(key), 8, 2)
      )
    )
  }

  container_mac_addresses = {
    for key, container in var.containers : key => coalesce(
      container.mac_address,
      format(
        "06:%s:%s:%s:%s:%s",
        substr(md5(key), 0, 2),
        substr(md5(key), 2, 2),
        substr(md5(key), 4, 2),
        substr(md5(key), 6, 2),
        substr(md5(key), 8, 2)
      )
    )
  }
}

resource "proxmox_virtual_environment_download_file" "ubuntu_cloud_image" {
  content_type = "iso"
  datastore_id = var.image_datastore_id
  node_name    = var.node_name
  url          = var.cloud_image_url
}

resource "proxmox_virtual_environment_download_file" "ubuntu_lxc_template" {
  content_type = "vztmpl"
  datastore_id = var.image_datastore_id
  node_name    = var.node_name
  url          = var.container_template_url
}

resource "proxmox_virtual_environment_file" "cloud_config" {
  for_each = var.vms

  content_type = "snippets"
  datastore_id = var.image_datastore_id
  node_name    = var.node_name

  source_raw {
    file_name = "${each.key}-user-data.yaml"
    data = <<-EOF
      #cloud-config
      hostname: ${coalesce(each.value.name, each.key)}
      manage_etc_hosts: true
      users:
        - default
        - name: ${each.value.username}
          groups:
            - sudo
          shell: /bin/bash
          ssh_authorized_keys:
            - ${trimspace(each.value.ssh_public_key)}
          sudo: ALL=(ALL) NOPASSWD:ALL
      package_update: true
      packages:
        - qemu-guest-agent
      runcmd:
        - systemctl enable --now qemu-guest-agent
    EOF
  }
}

resource "proxmox_virtual_environment_vm" "this" {
  for_each  = var.vms

  name      = coalesce(each.value.name, each.key)
  node_name = var.node_name
  vm_id     = each.value.vm_id
  tags      = ["terraform"]

  agent {
    enabled = true
  }

  started         = true
  stop_on_destroy = true

  cpu {
    cores = each.value.cpu_cores
  }

  memory {
    dedicated = each.value.memory_mb
  }

  disk {
    datastore_id = coalesce(each.value.datastore_id, var.datastore_id)
    file_id      = proxmox_virtual_environment_download_file.ubuntu_cloud_image.id
    interface    = "virtio0"
    iothread     = true
    discard      = "on"
    size         = each.value.disk_size_gb
  }

  initialization {
    datastore_id = coalesce(each.value.datastore_id, var.datastore_id)

    ip_config {
      ipv4 {
        address = "dhcp"
      }
    }

    user_data_file_id = proxmox_virtual_environment_file.cloud_config[each.key].id
  }

  network_device {
    bridge = coalesce(each.value.network_bridge, var.network_bridge)
    mac_address = local.vm_mac_addresses[each.key]
  }

  depends_on = [routeros_ip_dhcp_server_lease.vm]
}

resource "routeros_ip_dhcp_server_lease" "vm" {
  for_each = {
    for key, vm in var.vms : key => vm
    if vm.ip_address != "dhcp"
  }

  address     = split("/", each.value.ip_address)[0]
  mac_address = local.vm_mac_addresses[each.key]
  server      = each.value.dhcp_server
  comment     = "Managed by Terraform (${each.key})"
  lease_time  = "0s"
}

resource "routeros_ip_dhcp_server_lease" "container" {
  for_each = {
    for key, container in var.containers : key => container
    if container.ip_address != "dhcp"
  }

  address     = split("/", each.value.ip_address)[0]
  mac_address = local.container_mac_addresses[each.key]
  server      = each.value.dhcp_server
  comment     = "Managed by Terraform (${each.key})"
  lease_time  = "0s"
}

resource "proxmox_virtual_environment_container" "this" {
  for_each = var.containers

  node_name   = var.node_name
  vm_id       = each.value.vm_id
  description = "Managed by Terraform"
  unprivileged = true
  start_on_boot = true
  tags         = ["terraform"]

  cpu {
    cores = each.value.cpu_cores
  }

  memory {
    dedicated = each.value.memory_mb
    swap      = each.value.swap_mb
  }

  disk {
    datastore_id = coalesce(each.value.datastore_id, var.datastore_id)
    size         = each.value.disk_size_gb
  }

  features {
    nesting = each.value.nesting
  }

  initialization {
    hostname = coalesce(each.value.name, each.key)

    ip_config {
      ipv4 {
        address = "dhcp"
      }
    }

    user_account {
      keys = [trimspace(each.value.ssh_public_key)]
    }
  }

  network_interface {
    name       = "eth0"
    bridge     = coalesce(each.value.network_bridge, var.network_bridge)
    mac_address = local.container_mac_addresses[each.key]
  }

  operating_system {
    template_file_id = proxmox_virtual_environment_download_file.ubuntu_lxc_template.id
    type             = "ubuntu"
  }

  wait_for_ip {
    ipv4 = true
  }

  depends_on = [routeros_ip_dhcp_server_lease.container]
}

resource "aws_route53_record" "vm" {
  for_each = {
    for key, vm in var.vms : key => vm
    if var.route53_zone_id != null && vm.dns_name != null
  }

  zone_id = var.route53_zone_id
  name    = each.value.dns_name
  type    = "A"
  ttl     = 60
  records = [proxmox_virtual_environment_vm.this[each.key].ipv4_addresses[1][0]]
}

resource "aws_route53_record" "container" {
  for_each = {
    for key, container in var.containers : key => container
    if var.route53_zone_id != null && container.dns_name != null
  }

  zone_id = var.route53_zone_id
  name    = each.value.dns_name
  type    = "A"
  ttl     = 60
  records = [each.value.ip_address != "dhcp" ? split("/", each.value.ip_address)[0] : proxmox_virtual_environment_container.this[each.key].ipv4["eth0"]]
}
