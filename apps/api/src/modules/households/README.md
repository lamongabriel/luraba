# households

Households, members and roles, invitations (token, accept, reject, resend) and lifecycle (`households.lifecycle.ts`).

## Rules

Deleting a household cascades in the database; `deleteHousehold` first collects its upload object keys and removes the bucket objects afterwards (see `uploads/README.md`). `households.access.ts` holds membership checks. The household picture is an attachment (`household` target, role `logo`); `imageUploadId` points at an image upload of the same household (`assertHouseholdImageUpload`, `null` clears it). Migration `0047_household_image`.

General module conventions: [../README.md](../README.md).

## Roles and who may change them

The policy is `HOUSEHOLD_ROLE_PERMISSIONS` in `@luraba/contracts`; the rank rules live next to it
(`getAssignableRoles`, `canAssignRole`, `canManageMember`) and are used by this service and by the
web UI, so the UI never offers what the API refuses.

- **Only owners change owners.** Admins can invite, change and remove only members and viewers, can
  never grant admin or owner, and can never change their own role. Members and viewers manage nobody.
  The last owner can't be demoted or removed. Rotating or cancelling an invite needs the same rank as
  creating one (`assertCanManageInvite`).
- **The household comes from the route first.** `requireAccess` resolves the household from the
  route param and only falls back to `X-Household-Id`. Before, the header won, so a role in another
  household authorized the call (an admin who owned a second household could demote the first
  one's owner). `households.security.http.test.ts` covers this.
- **Invitee name.** Invites carry an optional `name` (`invitee_name`, migration `0049_invite_name`)
  shown in the invitations table.
