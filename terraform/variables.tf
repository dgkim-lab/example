variable "proxmox_endpoint" {
  description = "Proxmox API endpoint, for example https://pve.example.com:8006/"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API token in the form user@realm!token=secret"
  type        = string
  sensitive   = true
}

variable "proxmox_insecure" {
  description = "Skip TLS certificate verification. Prefer false with a trusted certificate."
  type        = bool
  default     = true
}

variable "aws_region" {
  description = "AWS region used by the Route 53 provider. Route 53 is global, but the provider still requires a region."
  type        = string
  default     = "us-east-1"
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID. Set to null to skip DNS records."
  type        = string
  default     = null
}

variable "mikrotik_host" {
  description = "MikroTik RouterOS REST API URL, for example https://192.168.1.1."
  type        = string
  default     = null
}

variable "mikrotik_username" {
  description = "MikroTik API username."
  type        = string
  default     = null
}

variable "mikrotik_password" {
  description = "MikroTik API password."
  type        = string
  sensitive   = true
  default     = null
}

variable "mikrotik_insecure" {
  description = "Skip TLS certificate verification for the MikroTik API."
  type        = bool
  default     = true
}

variable "node_name" {
  description = "Proxmox node on which to create the VM."
  type        = string
}

variable "datastore_id" {
  description = "Datastore for the VM disk and cloud-init disk."
  type        = string
  default     = "local-lvm"
}

variable "image_datastore_id" {
  description = "Datastore that accepts ISO/image content for the downloaded cloud image."
  type        = string
  default     = "local"
}

variable "network_bridge" {
  description = "Proxmox bridge connected to the VM network."
  type        = string
  default     = "vmbr0"
}

variable "cloud_image_url" {
  description = "URL of a compatible Ubuntu cloud image."
  type        = string
  default     = "https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img"
}

variable "container_template_url" {
  description = "URL of an Ubuntu LXC root filesystem template."
  type        = string
  default     = "https://cloud-images.ubuntu.com/releases/noble/release/ubuntu-24.04-server-cloudimg-amd64-root.tar.xz"
}

variable "vms" {
  description = "VMs to create, keyed by a stable Terraform name."
  type = map(object({
    name           = optional(string)
    vm_id          = number
    username       = optional(string, "ubuntu")
    ssh_public_key = string
    cpu_cores      = optional(number, 2)
    memory_mb      = optional(number, 2048)
    disk_size_gb   = optional(number, 20)
    ip_address     = string
    dns_name       = optional(string)
    datastore_id   = optional(string)
    network_bridge = optional(string)
    mac_address    = optional(string)
    dhcp_server    = optional(string)
  }))
}

variable "containers" {
  description = "LXC containers to create, keyed by a stable Terraform name."
  type = map(object({
    name           = optional(string)
    vm_id          = number
    ssh_public_key = string
    cpu_cores      = optional(number, 2)
    memory_mb      = optional(number, 1024)
    swap_mb        = optional(number, 512)
    disk_size_gb   = optional(number, 8)
    ip_address     = string
    mac_address    = optional(string)
    dhcp_server    = optional(string)
    dns_name       = optional(string)
    nesting        = optional(bool, false)
    datastore_id   = optional(string)
    network_bridge = optional(string)
  }))
  default = {}
}
