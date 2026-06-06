# Add Another AWS Account to IAM Identity Center

This document explains how to make another AWS account available through an existing IAM Identity Center setup.

This is separate from the Keycloak SAML configuration. Keycloak authenticates users, but AWS Organizations and IAM Identity Center decide which AWS accounts those users can access.

## Target Result

After this setup:

1. The AWS account is a member of the same AWS Organization as IAM Identity Center.
2. IAM Identity Center can assign users or groups to that account.
3. Users see the account in the AWS access portal.
4. Users can select a permission set and open the AWS Console or use the AWS CLI.

## Prerequisites

- IAM Identity Center is already enabled
- Keycloak login to IAM Identity Center already works
- You have access to the AWS Organizations management account
- You have administrator access to the AWS account you want to add
- The account you want to add is not already a member of a different AWS Organization

Important:

- One AWS account can belong to only one AWS Organization at a time.
- Joining an account to an organization can affect billing, organization policies, and service control policies.
- IAM Identity Center does not create AWS accounts by itself. It grants access to accounts that are in the AWS Organization.

## 1. Choose How the Account Will Join

There are two common cases.

### Option A: Invite an Existing AWS Account

Use this when the AWS account already exists.

From the AWS Organizations management account:

1. Open `AWS Organizations`.
2. Go to `AWS accounts`.
3. Choose `Add an AWS account`.
4. Choose `Invite an existing AWS account`.
5. Enter the target account ID or account email address.
6. Send the invitation.

Then, in the invited AWS account:

1. Sign in as an administrator.
2. Open `AWS Organizations`.
3. Review the invitation.
4. Accept the invitation.

After acceptance, the account becomes a member account in the organization.

### Option B: Create a New AWS Account in the Organization

Use this when you want AWS Organizations to create the account.

From the AWS Organizations management account:

1. Open `AWS Organizations`.
2. Go to `AWS accounts`.
3. Choose `Add an AWS account`.
4. Choose `Create an AWS account`.
5. Enter the account name and email address.
6. Complete account creation.

After creation, the account is already part of the organization.

## 2. Move the Account to the Correct OU

If you use organizational units:

1. Open `AWS Organizations`.
2. Select the new member account.
3. Move it to the correct OU.
4. Confirm the expected service control policies apply.

Do this before broad access is assigned.

## 3. Confirm IAM Identity Center Can See the Account

In the management account:

1. Open `IAM Identity Center`.
2. Go to `AWS accounts`.
3. Confirm the new account appears in the account list.

If the account does not appear:

- confirm the account accepted the organization invitation
- confirm you are in the AWS Region where IAM Identity Center is enabled
- wait a few minutes and refresh the console

## 4. Create or Reuse a Permission Set

In IAM Identity Center:

1. Go to `Permission sets`.
2. Reuse an existing permission set or create a new one.

Example permission sets:

- `AdministratorAccess`
- `PowerUserAccess`
- `ReadOnlyAccess`
- `BillingReadOnly`

For a first test, use a simple permission set such as `ReadOnlyAccess`.

## 5. Assign Users or Groups to the New Account

In IAM Identity Center:

1. Go to `AWS accounts`.
2. Select the new account.
3. Choose `Assign users or groups`.
4. Select the IAM Identity Center user or group.
5. Select the permission set.
6. Submit the assignment.

IAM Identity Center provisions an AWS-managed IAM role into the member account for that permission set.

Do not create this role manually in IAM. IAM Identity Center manages it.

## 6. Test Web Login

Use the AWS access portal:

1. Sign out of AWS.
2. Open the IAM Identity Center access portal URL.
3. Sign in through Keycloak.
4. Confirm the new AWS account appears.
5. Open the account with the assigned permission set.

If the account does not appear, the user probably has no assignment for that account.

## 7. Test AWS CLI Access

Run the SSO configuration again and choose the new account:

```bash
aws configure sso --profile new-account-readonly
```

Use the same values for:

- SSO start URL
- SSO region
- SSO registration scopes

When prompted, choose:

- the new AWS account
- the assigned permission set

Then test:

```bash
aws sso login --profile new-account-readonly
aws sts get-caller-identity --profile new-account-readonly
```

For multiple accounts, keep one profile per account and permission set.

## Common Problems

### The account does not appear in IAM Identity Center

Common causes:

- the account has not accepted the AWS Organizations invitation
- the account belongs to another AWS Organization
- you are viewing IAM Identity Center in the wrong Region

Fix:

- confirm AWS Organizations membership first
- then check IAM Identity Center in its configured Region

### The user can sign in but does not see the new account

Cause:

- the user or group has no assignment for that account.

Fix:

- assign the user or group to the account with a permission set.

### Permission set assignment fails

Common causes:

- service control policies block required IAM actions
- IAM Identity Center cannot provision the managed role into the member account
- the member account is not fully joined to the organization yet

Fix:

- check AWS Organizations membership
- review service control policies on the account OU
- retry the assignment after a few minutes

### AWS CLI shows the old account only

Cause:

- the local CLI profile is configured for a specific account and permission set.

Fix:

- run `aws configure sso --profile <new-profile-name>` again
- choose the new AWS account during the wizard

## References

- AWS Organizations: invite an AWS account to join an organization
  https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_invite-account.html
- AWS Organizations: accept or decline an account invitation
  https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_accept-decline-invite.html
- IAM Identity Center: configure access to AWS accounts
  https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-accounts.html
- IAM Identity Center: permission sets
  https://docs.aws.amazon.com/singlesignon/latest/userguide/permissionsetsconcept.html
