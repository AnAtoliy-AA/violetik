export { RoleToggle } from "./ui/role-toggle";
export { AdminNoteForm } from "./ui/admin-note-form";
export { VipGrantForm } from "./ui/vip-grant-form";
export { VipRevokeButton } from "./ui/vip-revoke-button";
export { SuggestedMerges } from "./ui/suggested-merges";
export { MergeForm } from "./ui/merge-form";

export type {
  SuggestedMergeRow,
  SuggestedMergeUser,
} from "./ui/suggested-merges";
export type { MergeFormUser, MergeFormConflicts } from "./ui/merge-form";

export {
  setUserRoleAction,
  setAdminNoteAction,
  grantVipAction,
  revokeVipAction,
  mergeUsersAction,
} from "./api/actions";
export type {
  SetRoleActionResult,
  SetNoteActionResult,
  GrantVipActionResult,
  RevokeVipActionResult,
  MergeActionResult,
} from "./api/actions";
