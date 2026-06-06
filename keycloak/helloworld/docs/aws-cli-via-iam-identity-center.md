# AWS CLI with IAM Identity Center and Keycloak

This document explains how to use the AWS CLI after IAM Identity Center web login already works through Keycloak.

Key point:

- The AWS CLI does not talk to Keycloak directly.
- The AWS CLI talks to IAM Identity Center.
- IAM Identity Center opens a browser login flow, which redirects to Keycloak.
- After login, the AWS CLI receives temporary credentials for the selected AWS account and permission set.

## Prerequisites

- AWS CLI v2 is installed
- IAM Identity Center web login works through Keycloak
- Your IAM Identity Center user has an AWS account assignment
- You know the AWS access portal URL
- You know the IAM Identity Center region

Check the CLI version:

```bash
aws --version
```

Use AWS CLI v2. AWS CLI v1 does not support this flow properly.

## 1. Configure an SSO Profile

Run:

```bash
aws configure sso
```

Example answers:

```text
SSO session name: my-sso
SSO start URL: https://example.awsapps.com/start
SSO region: ap-northeast-2
SSO registration scopes: sso:account:access
```

The CLI opens a browser. Complete the login through IAM Identity Center and Keycloak.

After login, choose:

- AWS account
- permission set
- default AWS region
- output format
- local profile name

Example profile name:

```text
dev-admin
```

## 2. Log In

Run:

```bash
aws sso login --profile dev-admin
```

This opens the browser again if your local SSO token is missing or expired.

## 3. Run AWS CLI Commands

Test the active identity:

```bash
aws sts get-caller-identity --profile dev-admin
```

Example command:

```bash
aws s3 ls --profile dev-admin
```

To avoid typing `--profile` every time:

```bash
export AWS_PROFILE=dev-admin
aws sts get-caller-identity
```

## 4. Example AWS Config

The generated config is stored in `~/.aws/config`.

It will look similar to:

```ini
[sso-session my-sso]
sso_start_url = https://example.awsapps.com/start
sso_region = ap-northeast-2
sso_registration_scopes = sso:account:access

[profile dev-admin]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = ap-northeast-2
output = json
```

Do not manually add Keycloak URLs here. The AWS CLI only needs IAM Identity Center settings.

## 5. Log Out

To clear local IAM Identity Center sessions:

```bash
aws sso logout
```

## Common Problems

### Browser login works, but no AWS accounts appear

Cause:

- The IAM Identity Center user has no account assignment.

Fix:

- Assign the user or group to an AWS account and permission set in IAM Identity Center.

### `aws configure sso` does not open Keycloak

Cause:

- The wrong AWS access portal URL or SSO region was entered.

Fix:

- Copy the access portal URL and region from IAM Identity Center settings.

### CLI commands fail after some time

Cause:

- The local SSO token expired.

Fix:

```bash
aws sso login --profile dev-admin
```

## References

- AWS CLI IAM Identity Center configuration
  https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS command line sign-in
  https://docs.aws.amazon.com/signin/latest/userguide/command-line-sign-in.html
