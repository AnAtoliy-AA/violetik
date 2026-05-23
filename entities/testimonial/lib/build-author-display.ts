export interface BuildAuthorDisplayInput {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string | null;
}

export function buildAuthorDisplay(u: BuildAuthorDisplayInput): string {
  if (u.firstName) {
    const initial = u.lastName ? ` ${u.lastName.trim().charAt(0)}.` : "";
    return `${u.firstName}${initial}`;
  }
  if (u.username) return u.username;
  if (u.email) {
    const at = u.email.indexOf("@");
    const head = at > 0 ? u.email.slice(0, at) : u.email;
    return head.length <= 2 ? head : `${head.slice(0, 2)}…`;
  }
  return "Guest";
}
