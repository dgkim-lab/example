terraform {
  backend "s3" {
    # Replace this with an existing private S3 bucket before running terraform init.
    bucket       = "replace-with-your-terraform-state-bucket"
    key          = "proxmox/lab/terraform.tfstate"
    region       = "ap-northeast-2"
    encrypt      = true
    use_lockfile = true
  }
}
