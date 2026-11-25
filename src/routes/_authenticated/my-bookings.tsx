import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Ticket, ShieldCheck } from "lucide-react";
import { Page, Empty, ErrorNotice } from "@/components/CinemaUI";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { rpc, head, money, fullTime, type Schedule } from "@/lib/cinema";
import { adminQuery } from "@/lib/account";
type Booking = {
  booking_id: string;
  booking_no: string;
  status: string;
  category: string;
  movie_title: string;
  screen_name: string;
  starts_at: string;
  seat_labels: string[];
  seat_count: number;
  total_amount: number;
  has_discount: boolean;
  cancel_deadline: string;
  can_cancel: boolean;
  refund_amount: number | null;
  cancelled_at: string | null;
};
const q = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: () => rpc<Booking[]>("get_my_bookings"),
  retry: false,
});
export const Route = createFileRoute("/_authenticated/my-bookings")({
  head: () => head("My bookings", "View your Cinema One tickets, booking history and refunds."),
  beforeLoad: async ({ context }) => {
    if (await context.queryClient.fetchQuery(adminQuery)) throw redirect({ to: "/" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Bookings,
});
function Bookings() {
  const { data, refetch } = useSuspenseQuery(q),
    [tab, setTab] = useState("UPCOMING"),
    [cancel, setCancel] = useState<Booking | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const list = data
    .filter((b) => b.category === tab)
    .sort((a, b) =>
      tab === "UPCOMING"
        ? a.starts_at.localeCompare(b.starts_at)
        : b.starts_at.localeCompare(a.starts_at),
    );
  async function refund() {
    if (!cancel) return;
    setBusy(true);
    setError(null);
    try {
      const result = await rpc<
        { booking_no: string; refund_amount: number; cancelled_at: string }[]
      >("cancel_booking", { p_booking_id: cancel.booking_id });
      setCancel(null);
      toast.success(`${money(result[0]?.refund_amount ?? cancel.total_amount)} refunded.`);
      await refetch();
    } catch (e) {
      setError(e);
      await refetch();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="My bookings" subtitle="Your cinema nights, all in one place.">
      <div className="flex gap-2 border-b border-border pb-4 mb-8" role="tablist">
        {["UPCOMING", "PAST", "CANCELLED"].map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={t === tab}
            variant={t === tab ? "default" : "ghost"}
            onClick={() => setTab(t)}
          >
            {t[0]}
            {t.slice(1).toLowerCase()}{" "}
            <span className="text-xs">{data.filter((b) => b.category === t).length}</span>
          </Button>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-10">
        <div>
          {list.length ? (
            list.map((b) => (
              <article key={b.booking_id} className="border border-border rounded-md p-6 mb-4">
                <div className="flex justify-between gap-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Ticket size={15} />
                    {b.booking_no}
                  </p>
                  <span className="text-xs text-muted-foreground">{b.screen_name}</span>
                </div>
                <h2 className="text-2xl mt-4">{b.movie_title}</h2>
                <p className="text-sm mt-2">{fullTime(b.starts_at)}</p>
                <p className="text-sm text-muted-foreground mt-3">
                  Seats {b.seat_labels.join(", ")}
                </p>
                <p className="font-medium mt-3">{money(b.total_amount)}</p>
                {b.has_discount && (
                  <p className="text-xs text-primary mt-2">Isolated-seat discount applied</p>
                )}
                {tab === "UPCOMING" && (
                  <div className="mt-5 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {b.can_cancel
                        ? `Free cancellation until ${fullTime(b.cancel_deadline)}`
                        : "Cancellation closed"}
                    </p>
                    {b.can_cancel && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCancel(b);
                          setError(null);
                        }}
                      >
                        Cancel booking
                      </Button>
                    )}
                  </div>
                )}
                {tab === "CANCELLED" && (
                  <p className="text-xs text-muted-foreground mt-4">
                    {money(b.refund_amount ?? 0)} refunded
                    {b.cancelled_at ? ` · ${fullTime(b.cancelled_at)}` : ""}
                  </p>
                )}
              </article>
            ))
          ) : (
            <Empty title={`No ${tab.toLowerCase()} bookings`}>
              Your {tab.toLowerCase()} tickets will appear here.
            </Empty>
          )}
        </div>
        <aside className="bg-muted p-6 self-start">
          <ShieldCheck className="text-primary mb-4" size={22} />
          <h2 className="text-xl">Refund policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Full refund until 20 minutes before the screening starts. No cancellation after that.
            Bookings are cancelled as a whole.
          </p>
        </aside>
      </div>
      <Dialog
        open={!!cancel}
        onOpenChange={(open) => {
          if (!open && !busy) setCancel(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Cancel and refund?</DialogTitle>
          <DialogDescription>{cancel?.movie_title}</DialogDescription>
          {cancel && (
            <>
              <p className="text-sm">
                {fullTime(cancel.starts_at)} · {cancel.screen_name}
              </p>
              <p className="text-sm">Seats {cancel.seat_labels.join(", ")}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm border-y border-border py-4">
                <dt>Amount paid</dt>
                <dd className="text-right">{money(cancel.total_amount)}</dd>
                <dt>Full refund</dt>
                <dd className="text-right font-semibold">{money(cancel.total_amount)}</dd>
              </dl>
              <ErrorNotice error={error} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" disabled={busy} onClick={() => setCancel(null)}>
                  Keep booking
                </Button>
                <Button disabled={busy} onClick={refund}>
                  {busy ? "Refunding…" : "Cancel and refund"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
