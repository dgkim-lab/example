output "vm_id" {
  description = "Created Proxmox VM IDs keyed by the vms map keys."
  value       = { for key, vm in proxmox_virtual_environment_vm.this : key => vm.vm_id }
}

output "vm_name" {
  description = "Created VM names keyed by the vms map keys."
  value       = { for key, vm in proxmox_virtual_environment_vm.this : key => vm.name }
}

output "vm_ipv4_addresses" {
  description = "IPv4 addresses keyed by the vms map keys, when available."
  value       = { for key, vm in proxmox_virtual_environment_vm.this : key => vm.ipv4_addresses }
}

output "container_id" {
  description = "Created LXC container IDs keyed by the containers map keys."
  value       = { for key, container in proxmox_virtual_environment_container.this : key => container.vm_id }
}

output "container_ipv4_addresses" {
  description = "Created LXC container IPv4 addresses keyed by the containers map keys."
  value       = { for key, container in proxmox_virtual_environment_container.this : key => container.ipv4 }
}
