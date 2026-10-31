# components/households/roles

Everything that explains or changes roles. Roles are fixed (owner, admin, member, viewer); nothing
here creates or edits a role, only who holds one.

| Component | Use it for |
| --- | --- |
| `RoleBadge` | a role name, colored per role |
| `RolePermissions`, `ActionChips` | what one role can and cannot do, by area |
| `RolePicker` | choosing a role (invite sheet): compact rows with a one-line summary; only the roles you may give |
| `MemberRoleControl` | a member's role: picker with `ChangeRoleDialog` for people you may manage, a badge otherwise |
| `ChangeRoleDialog` | confirms a change and lists abilities gained and lost |

The permission text comes from `lib/permission-catalog.ts` (groups, action labels, `summarizeRole`, `diffRoles`); a
unit test keeps it in step with `PERMISSIONS`. Who may do what comes from the rank helpers in
`@luraba/contracts` (`getAssignableRoles`, `canManageMember`), never from role strings in the UI.

Gate pages and buttons by permission (`PermissionGuard`, `PermissionButton`, `useCan`,
`SectionNavItem.permission`), not by role name. The page is `/household/roles`: one list of roles, each with its description, a summary line, an
expandable permission list and (for people who can see members) the people who hold it.
