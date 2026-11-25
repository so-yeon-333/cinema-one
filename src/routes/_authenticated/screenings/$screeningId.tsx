import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { RefreshCw, ArrowLeft, ArrowRight, Check, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, ErrorNotice } from "@/components/CinemaUI";
import { SeatMap } from "@/components/SeatMap";
import {
  head,
  rpc,
  fullTime,
  money,
  estimate,
  selectionError,
  message,
  errorCode,
  type Seat,
} from "@/lib/cinema";
import { useAdmin } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
const seatQuery = (id: string) =>
  queryOptions({
    queryKey: ["seat-status", id],
    queryFn: () => rpc<Seat[]>("get_seat_status", { p_screening_id: id }),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["screening-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("screening")
        .select("*, movie(title), screen(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
export const Route = createFileRoute("/_authenticated/screenings/$screeningId")({
  head: () =>
    head(
      "Choose your seats",
      "Choose seats, review your tickets and book your Cinema One screening.",
    ),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(seatQuery(params.screeningId)),
      context.queryClient.ensureQueryData(detailQuery(params.screeningId)),
    ]);
  },
  component: Booking,
});
type Confirmation = {
  booking_id: string;
  booking_no: string;
  total_amount: number;
  seats: {
    seat_id: string;
    row_label: string;
    col_no: number;
    unit_price: number;
    is_discounted: boolean;
  }[];
};
function Booking() {
  const { screeningId } = Route.useParams(),
    navigate = useNavigate(),
    qc = useQueryClient(),
    admin = useAdmin();
  const { data: seats, refetch } = useSuspenseQuery(seatQuery(screeningId)),
    { data: details } = useSuspenseQuery(detailQuery(screeningId));
  const [selected, setSelected] = useState<string[]>([]),
    [step, setStep] = useState<"seats" | "review" | "confirmed">("seats"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [discountNotice, setDiscountNotice] = useState(false),
    [startedError, setStartedError] = useState(false);
  const first = seats[0],
    discount = first?.discount_active ?? false,
    max = first?.max_seats ?? 0,
    chosen = seats.filter((s) => selected.includes(s.seat_id)),
    total = chosen.reduce((sum, s) => sum + estimate(s), 0),
    rule = selectionError(seats, selected, max);
  useEffect(() => {
    setDiscountNotice(false);
    if (discount) return;
    const delay = new Date(details.starts_at).getTime() - 20 * 60000 - Date.now();
    if (delay < 0) {
      setDiscountNotice(Date.now() < new Date(details.starts_at).getTime());
      return;
    }
    const timer = setTimeout(() => setDiscountNotice(true), Math.min(delay + 1, 2147483647));
    return () => clearTimeout(timer);
  }, [discount, details.starts_at, seats]);
  async function refresh(clear = false) {
    const result = await refetch();
    if (result.data)
      setSelected((old) =>
        clear
          ? []
          : old.filter((id) =>
              result.data.some((s) => s.seat_id === id && s.status === "AVAILABLE"),
            ),
      );
    if (result.error) setError(message(result.error));
  }
  function select(s: Seat) {
    setSelected((prev) =>
      prev.includes(s.seat_id) ? prev.filter((id) => id !== s.seat_id) : [...prev, s.seat_id],
    );
    setError("");
  }
  async function pay() {
    setBusy(true);
    try {
      const result = await rpc<Confirmation>("book_seats", {
        p_screening_id: screeningId,
        p_seat_ids: selected,
      });
      setConfirmation(result);
      setStep("confirmed");
      await qc.invalidateQueries({ queryKey: ["my-bookings"] });
      await qc.invalidateQueries({ queryKey: ["schedule"] });
    } catch (e) {
      const code = errorCode(e);
      setStep("seats");
      setError(message(e));
      if (code === "SEAT_TAKEN" || code === "SEAT_NOT_IN_SCREEN") await refresh(true);
      else if (code === "SCREENING_STARTED") setStartedError(true);
      else if (code === "NOT_LOGGED_IN")
        await navigate({ to: "/auth", search: { redirect: `/screenings/${screeningId}` } });
    } finally {
      setBusy(false);
    }
  }
  if (first?.screening_started || startedError)
    return (
      <Page title={details.movie.title}>
        <p className="form-error mb-6">
          This screening has already started and can no longer be booked.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Back to showtimes</Link>
        </Button>
      </Page>
    );
  if (step === "confirmed" && confirmation)
    return (
      <Page title="You’re going to the movies">
        <div className="max-w-lg mx-auto py-8">
          <Check className="size-10 text-primary mb-5" />
          <p className="eyebrow text-primary mb-3">Booking confirmed</p>
          <h2 className="text-3xl">{details.movie.title}</h2>
          <p className="text-sm text-muted-foreground mt-3">
            {fullTime(details.starts_at)} · {details.screen.name}
          </p>
          <p className="text-sm font-medium my-6 flex items-center gap-2">
            <Ticket size={16} />
            {confirmation.booking_no}
          </p>
          <div className="border-y border-border py-5 space-y-3">
            {confirmation.seats.map((s) => (
              <div key={s.seat_id} className="flex justify-between text-sm">
                <span>
                  {s.row_label}
                  {s.col_no}
                  {s.is_discounted && (
                    <small className="block text-primary">Isolated-seat discount applied</small>
                  )}
                </span>
                <span>{money(s.unit_price)}</span>
              </div>
            ))}
          </div>
          <p className="flex justify-between font-semibold my-6">
            <span>Total paid</span>
            <span>{money(confirmation.total_amount)}</span>
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/my-bookings">
                My bookings
                <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Showtimes</Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  return (
    <Page
      title={details.movie.title}
      subtitle={`${details.screen.name} · ${fullTime(details.starts_at)}`}
    >
      <div className="flex items-center gap-3 text-sm border-b border-border pb-5">
        <span className={step === "seats" ? "text-primary" : "text-muted-foreground"}>
          01 · Choose seats
        </span>
        <ArrowRight size={14} />
        <span className={step === "review" ? "text-primary" : "text-muted-foreground"}>
          02 · Review & pay
        </span>
        {!admin.data && (
          <span className="ml-auto hidden sm:block text-xs text-muted-foreground">
            Up to {max} seats per booking
          </span>
        )}
      </div>
      {discountNotice && (
        <div className="bg-discount p-4 my-5 flex flex-wrap justify-between gap-3 items-center">
          <p className="text-sm">
            Isolated-seat discounts now apply. Refresh to see the current prices.
          </p>
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw />
            Refresh
          </Button>
        </div>
      )}
      {step === "seats" ? (
        <div className="grid lg:grid-cols-[1fr_300px] gap-10 mt-8">
          <section className="min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl">{admin.data ? "Seating plan" : "Choose your seats"}</h2>
              <Button variant="ghost" size="sm" onClick={() => refresh()}>
                <RefreshCw />
                Refresh
              </Button>
            </div>
            <SeatMap
              seats={seats}
              selected={selected}
              discount={discount}
              {...(!admin.data ? { onSelect: select } : {})}
            />
            <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground mt-4">
              {[
                { label: "Available", state: "available" },
                { label: "Selected", state: "selected" },
                { label: "Booked", state: "BOOKED" },
                ...(discount ? [{ label: "Isolated seat (20% off)", state: "discount" }] : []),
              ]
                .filter((l) => !admin.data || l.label !== "Selected")
                .map((l) => (
                  <span key={l.state} className="flex gap-2 items-center">
                    <span className="seat-cell inline-block !w-4 !h-4" data-state={l.state} />
                    {l.label}
                  </span>
                ))}
            </div>
          </section>
          {!admin.data && (
            <aside className="bg-muted p-6 self-start">
              <h2 className="text-xl">Your tickets</h2>
              <p className="text-xs text-muted-foreground mt-3">
                {chosen.length} {chosen.length === 1 ? "seat" : "seats"} selected
              </p>
              <div className="py-5 min-h-20 space-y-3">
                {chosen.length ? (
                  chosen.map((s) => (
                    <div className="flex justify-between text-sm" key={s.seat_id}>
                      <span>
                        {s.row_label}
                        {s.col_no}
                        {discount && s.is_isolated && (
                          <small className="block text-primary">Isolated-seat discount</small>
                        )}
                      </span>
                      <span>{money(estimate(s))}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No seats selected</p>
                )}
              </div>
              <div className="flex justify-between pt-4 border-t border-border font-medium">
                <span>Estimated total</span>
                <span>{money(total)}</span>
              </div>
              <div className="min-h-20 py-4">
                <p role="alert" className="form-error">
                  {error || rule}
                </p>
              </div>
              <Button
                className="w-full"
                disabled={!chosen.length || !!rule}
                onClick={() => {
                  setStep("review");
                  setError("");
                }}
              >
                Book now
                <ArrowRight />
              </Button>
            </aside>
          )}
        </div>
      ) : (
        <div className="max-w-lg mx-auto py-10">
          <h2 className="text-3xl mb-6">Review your booking</h2>
          <p className="font-medium">{details.movie.title}</p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {details.screen.name} · {fullTime(details.starts_at)}
          </p>
          <div className="border-y border-border py-5 space-y-4">
            {chosen.map((s) => (
              <div className="flex justify-between text-sm" key={s.seat_id}>
                <span>
                  Seat {s.row_label}
                  {s.col_no}
                  {discount && s.is_isolated && (
                    <small className="block text-primary">Isolated-seat discount</small>
                  )}
                </span>
                <span>{money(estimate(s))}</span>
              </div>
            ))}
          </div>
          <p className="flex justify-between font-semibold my-6">
            <span>Estimated total</span>
            <span>{money(total)}</span>
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Mock payment · No card details or real charge
          </p>
          <div className="flex justify-between gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setStep("seats")}>
              <ArrowLeft />
              Back to seats
            </Button>
            <Button disabled={busy} onClick={pay}>
              {busy ? "Processing…" : "Pay"}
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </Page>
  );
}
