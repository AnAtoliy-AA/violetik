import { signOut } from "@/auth";
import { buttonClassName } from "@/shared/ui/button";

export interface SignOutButtonProps {
  label: string;
  /** Where to send the user after sign-out. Defaults to /welcome. */
  redirectTo?: string;
}

/**
 * Server-action–driven sign-out. Renders as a small button styled with
 * the design-system outline variant.
 */
export function SignOutButton({ label, redirectTo = "/welcome" }: SignOutButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo });
      }}
    >
      <button
        type="submit"
        className={buttonClassName({ variant: "outline", size: "sm" })}
      >
        {label}
      </button>
    </form>
  );
}
