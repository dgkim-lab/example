# AWS IAM Identity Center Login via Keycloak

This document explains how to let users sign in to AWS IAM Identity Center through Keycloak.

It is different from `docs/aws-console-via-keycloak.md`:

- `aws-console-via-keycloak.md` uses direct IAM SAML federation into one AWS account.
- This guide uses IAM Identity Center as the AWS access layer for accounts, permission sets, and AWS access portal sessions.

The Keycloak side can still use Google Workspace as the upstream authentication source, as documented in `docs/google-workspace-integration.md`.

## Target Flow

The login chain is:

1. User opens the AWS access portal URL.
2. IAM Identity Center redirects the user to Keycloak as the external SAML identity provider.
3. Keycloak authenticates the user locally or through Google Workspace.
4. Keycloak sends a SAML response back to IAM Identity Center.
5. IAM Identity Center matches the SAML user to a provisioned user.
6. The user chooses an assigned AWS account and permission set.

Use this pattern when you want centralized AWS account access across an AWS Organization.

## Architecture

Authentication source:

- Google Workspace or Keycloak users

Federation provider:

- Keycloak as a SAML identity provider

AWS target:

- AWS IAM Identity Center
- AWS access portal
- permission sets assigned to users or groups

## Prerequisites

- Keycloak is running from this repository
- Google Workspace login already works in your Keycloak realm if you want Google-backed users
- IAM Identity Center is enabled in your AWS organization
- You have permission to change the IAM Identity Center identity source
- You know which Keycloak realm will authenticate users, for example `workspace-test`
- You have a plan for provisioning users and groups into IAM Identity Center

Important:

- Changing the IAM Identity Center identity source can affect existing assignments.
- Do not test this first in a production IAM Identity Center instance unless you have a rollback and assignment backup plan.
- Configuring Keycloak as a SAML identity provider does not provision users or groups into AWS.
- IAM Identity Center uses SAML for authentication and SCIM for automatic provisioning. Keycloak does not provide a complete built-in SCIM server for IAM Identity Center in a default install, so a first test normally uses manually created Identity Center users.

## 1. Confirm Keycloak Login Works First

Before adding IAM Identity Center, verify that the target user can sign in to Keycloak:

1. Open the Keycloak realm login page.
2. Sign in directly or with Google Workspace.
3. Confirm the user exists in the realm under `Users`.
4. Confirm the user's email address is populated and stable.

For Identity Center, the SAML `NameID` should be the user's email address.

## 2. Start the IAM Identity Center External IdP Setup

In AWS:

1. Open `IAM Identity Center`.
2. Go to `Settings`.
3. Open the `Identity source` tab.
4. Choose `Actions` -> `Change identity source`.
5. Select `External identity provider`.
6. On the external identity provider setup page, download the IAM Identity Center SAML service provider metadata.

Keep this AWS page open. You will return to it after configuring Keycloak.

The downloaded metadata contains the IAM Identity Center SAML service provider details, including the entity ID and assertion consumer service URLs.

## 3. Create a SAML Client in Keycloak for IAM Identity Center

In the target Keycloak realm:

1. Go to `Clients`.
2. Create a new client.
3. Set `Client type` to `SAML`.
4. Import the IAM Identity Center service provider metadata if your Keycloak UI offers metadata import.

If you configure the client manually, use the values from the IAM Identity Center metadata or setup page:

- Client ID: IAM Identity Center service provider entity ID
- Name: `AWS IAM Identity Center`
- Master SAML Processing URL: IAM Identity Center ACS URL
- Valid Redirect URIs: IAM Identity Center ACS URL

For a single-region test, configure the primary-region ACS URL first.

If the IAM Identity Center metadata includes multiple ACS URLs, add each required ACS URL to the Keycloak SAML client. This matters if your Identity Center instance uses dual-stack endpoints or is replicated to additional Regions.

## 4. Configure Keycloak SAML Settings

In the Keycloak SAML client, use these settings as a starting point:

- Name ID Format: `email`
- Force POST Binding: `On`
- Include AuthnStatement: `On`
- Sign Documents: `On`
- Sign Assertions: `On`

Do not configure AWS IAM role attributes here.

IAM Identity Center does not use the direct IAM federation attributes:

- `https://aws.amazon.com/SAML/Attributes/Role`
- `https://aws.amazon.com/SAML/Attributes/RoleSessionName`

Those attributes are for direct IAM SAML federation, not for IAM Identity Center account assignments.

## 5. Map the SAML NameID to Email

IAM Identity Center requires an email-address SAML `NameID`.

In the Keycloak SAML client or its dedicated client scope:

1. Open the client's mapper configuration.
2. Add or confirm a mapper that sends the user email as the SAML `NameID`.
3. Set the NameID format to:

```text
urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
```

The resulting `NameID` value should look like:

```text
alice@example.com
```

Recommended Keycloak user requirements:

- `Email` is set
- `Email verified` is true if you trust the upstream IdP
- Google Workspace users keep the same email address in Keycloak and IAM Identity Center

## 6. Export Keycloak SAML IdP Metadata

Keycloak exposes realm SAML IdP metadata at:

```text
http://localhost:8080/realms/<realm-name>/protocol/saml/descriptor
```

For example:

```text
http://localhost:8080/realms/workspace-test/protocol/saml/descriptor
```

Download this XML metadata file.

IAM Identity Center uses this metadata to trust SAML responses signed by Keycloak.

Important:

- For local testing, the metadata may contain `http://localhost:8080`.
- A real IAM Identity Center integration needs a stable HTTPS Keycloak URL reachable by users' browsers.
- If the Keycloak realm signing certificate changes, upload updated Keycloak metadata to IAM Identity Center.

## 7. Upload Keycloak Metadata to IAM Identity Center

Return to the IAM Identity Center external identity provider setup page.

Under identity provider metadata:

1. Upload the Keycloak SAML IdP metadata XML.
2. Review the identity source change warning.
3. Confirm the change only if this is the correct IAM Identity Center instance.
4. Complete the identity source change.

After this, the AWS access portal will redirect authentication requests to Keycloak.

## 8. Provision Matching Users in IAM Identity Center

SAML only authenticates the user. IAM Identity Center still needs user and group records for assignments.

Keycloak can prove who the user is, but IAM Identity Center must already have a matching user. Creating a Keycloak user, or brokering a Google Workspace user through Keycloak, does not automatically create that user in AWS.

For a first test:

1. In IAM Identity Center, create a user manually.
2. Set the username or primary email to match the SAML `NameID` email from Keycloak.
3. Create a group such as `aws-developers` if you want group-based assignments.
4. Add the user to the group.

For a real deployment:

- Use SCIM provisioning if your identity source can provide it.
- If Keycloak is the source of users, plan a SCIM-compatible provisioning path or automation.
- Keep usernames, emails, and group names stable because assignments depend on matching identities.

## 9. Create Permission Sets and Assign Access

In IAM Identity Center:

1. Go to `Permission sets`.
2. Create a permission set, for example `ReadOnlyAccess` or `AdministratorAccess`.
3. Go to `AWS accounts`.
4. Select the target account.
5. Assign the user or group.
6. Select the permission set.

This replaces the hardcoded IAM role mapper used in direct IAM federation.

IAM Identity Center creates and manages the underlying IAM roles in the target accounts.

## 10. Test the Login Flow

Use this sequence:

1. Sign out of AWS and Keycloak in your browser.
2. Open the AWS access portal URL for your IAM Identity Center instance.
3. Confirm AWS redirects to Keycloak.
4. Sign in through Keycloak or Google Workspace.
5. Confirm the browser returns to IAM Identity Center.
6. Confirm the assigned AWS account and permission set appear.
7. Open the AWS Management Console from the access portal.

If the login succeeds but no AWS accounts appear, authentication worked but assignments are missing or the SAML user did not match the assigned Identity Center user.

## 11. Optional: Attribute-Based Access Control

IAM Identity Center can use attributes for access control.

For a simple first test, skip ABAC and use user or group assignments.

After basic login works, you can add SAML attribute mappers in Keycloak for values such as:

- department
- cost center
- project

Then configure IAM Identity Center attributes for access control and reference those attributes in permission policies.

Keep this separate from the first login test. Attribute mapping problems are easier to debug after the base SAML flow is working.

## 12. Common Problems

### AWS access portal does not redirect to Keycloak

Common causes:

- IAM Identity Center identity source was not changed to external IdP
- the browser is using an old AWS access portal URL
- the identity source change was made in a different AWS region or organization

Fix:

- confirm the active IAM Identity Center instance
- copy the current AWS access portal URL from IAM Identity Center settings

### Keycloak login works, but AWS rejects the SAML response

Common causes:

- wrong ACS URL in the Keycloak SAML client
- wrong client ID or entity ID
- unsigned SAML response or assertion
- stale Keycloak signing certificate in IAM Identity Center

Fix:

- re-import the IAM Identity Center service provider metadata into Keycloak
- enable signed documents and assertions
- upload fresh Keycloak SAML metadata to IAM Identity Center

### AWS says the user is not found or has no access

Common causes:

- the SAML `NameID` does not match an IAM Identity Center user
- the Identity Center user was not created or provisioned
- the user exists but has no account or application assignment

Fix:

- inspect the SAML response and confirm the `NameID` is the user's email address
- create or provision the matching user in IAM Identity Center
- assign the user or group to an AWS account and permission set

### Multiple-region or dual-stack login fails

Common causes:

- IAM Identity Center metadata contains multiple ACS URLs
- only one ACS URL was added to the Keycloak SAML client
- users are entering through a regional portal endpoint that Keycloak does not allow

Fix:

- add every required IAM Identity Center ACS URL to the Keycloak SAML client
- start with the primary-region portal URL until the single-region flow works

### Localhost metadata works in a lab but not for other users

Cause:

- `localhost` in SAML metadata means the user's own machine, not your Keycloak server.

Fix:

- expose Keycloak through a stable HTTPS hostname
- regenerate or re-download Keycloak metadata after changing the hostname
- upload the new metadata to IAM Identity Center

## 13. Recommended First-Test Values

Example values for this repository:

- Keycloak realm: `workspace-test`
- Keycloak URL: `http://localhost:8080`
- Keycloak SAML metadata:

```text
http://localhost:8080/realms/workspace-test/protocol/saml/descriptor
```

- Keycloak SAML client name: `AWS IAM Identity Center`
- SAML NameID format:

```text
urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
```

- Test user email:

```text
alice@example.com
```

The exact IAM Identity Center entity ID, ACS URL, and AWS access portal URL must come from your IAM Identity Center instance.

## 14. Hardening After the First Successful Test

After the first login works:

- move Keycloak behind HTTPS with a stable hostname
- stop using dev credentials and `start-dev`
- use a production-grade Keycloak database
- define a repeatable user and group provisioning process
- prefer group-based IAM Identity Center assignments
- document the IAM Identity Center identity source rollback plan
- monitor Keycloak certificate rotation and update IAM Identity Center metadata when needed
- review session duration and MFA ownership

## References

- AWS IAM Identity Center: external identity providers
  https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-idp.html
- AWS IAM Identity Center: connect to an external identity provider
  https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-connect-idp.html
- AWS IAM Identity Center: SAML and SCIM federation with external IdPs
  https://docs.aws.amazon.com/singlesignon/latest/userguide/other-idps.html
- AWS IAM Identity Center: identity source change considerations
  https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-considerations.html
- AWS IAM Identity Center: attribute mappings
  https://docs.aws.amazon.com/singlesignon/latest/userguide/attributemappingsconcept.html
- Keycloak Server Administration Guide
  https://www.keycloak.org/docs/latest/server_admin/
