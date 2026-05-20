import { buttonClassName } from "@/shared/ui/button";
import { confirmBooking, declineBooking } from "../api/actions";

export interface BookingActionsProps {
  bookingId: string;
  confirmLabel: string;
  declineLabel: string;
}

export function BookingActions({
  bookingId,
  confirmLabel,
  declineLabel,
}: BookingActionsProps) {
  return (
    <div className="flex gap-2">
      <form action={confirmBooking.bind(null, bookingId)}>
        <button
          type="submit"
          className={buttonClassName({ variant: "gold", size: "sm" })}
        >
          {confirmLabel}
        </button>
      </form>
      <form action={declineBooking.bind(null, bookingId)}>
        <button
          type="submit"
          className={buttonClassName({ variant: "outline", size: "sm" })}
        >
          {declineLabel}
        </button>
      </form>
    </div>
  );
}
