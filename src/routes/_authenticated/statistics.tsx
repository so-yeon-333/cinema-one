import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Page, ErrorNotice, Empty } from "@/components/CinemaUI";
import { SeatMap } from "@/components/SeatMap";
import { Button } from "@/components/ui/button";
import { adminQuery } from "@/lib/account";
import { head, rpc, money, fullTime, kstDay, dayLabel, type Seat } from "@/lib/cinema";
import type { Database } from "@/integrations/supabase/types";
type Summary = Database["public"]["Functions"]["stats_summary"]["Returns"][number];
type ScreenStats = Database["public"]["Functions"]["stats_by_screen"]["Returns"][number];
type MovieStats = Database["public"]["Functions"]["stats_by_movie"]["Returns"][number];
type ScreeningStats = Database["public"]["Functions"]["stats_screenings"]["Returns"][number];
const sq = (period: string) =>
  queryOptions({
    queryKey: ["statistics", period, "summary"],
    queryFn: () => rpc<Summary[]>("stats_summary", { p_period: period }),
    retry: false,
  });
const scq = (period: string) =>
  queryOptions({
    queryKey: ["statistics", period, "screens"],
    queryFn: () => rpc<ScreenStats[]>("stats_by_screen", { p_period: period }),
    retry: false,
  });
const mq = (period: string) =>
  queryOptions({
    queryKey: ["statistics", period, "movies"],
    queryFn: () => rpc<MovieStats[]>("stats_by_movie", { p_period: period }),
    retry: false,
  });
const ssq = (period: string, day = "", screen = "") =>
  queryOptions({
    queryKey: ["statistics", period, "screenings", day, screen],
    queryFn: () =>
      rpc<ScreeningStats[]>("stats_screenings", {
        p_period: period,
        p_day: day || null,
        p_screen_id: screen || null,
      }),
    retry: false,
  });
export const Route = createFileRoute("/_authenticated/statistics")({
  head: () =>
    head("Statistics", "Cinema One finished-screening revenue, occupancy, refunds and seat sales."),
  loader: async ({ context }) => {
    const admin = await context.queryClient.fetchQuery(adminQuery);
    if (admin)
      await Promise.all([
        context.queryClient.ensureQueryData(sq("7d")),
        context.queryClient.ensureQueryData(scq("7d")),
        context.queryClient.ensureQueryData(mq("7d")),
        context.queryClient.ensureQueryData(ssq("7d")),
      ]);
    return { admin };
  },
  component: () =>
    Route.useLoaderData().admin ? (
      <Statistics />
    ) : (
      <main className="page-wrap py-12">
        <p>Only administrators can view statistics.</p>
      </main>
    ),
});
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);
function DataTable<T>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { title: string; value: (row: T) => React.ReactNode }[];
}) {
  if (!rows.length) return <Empty title="No finished screenings in this period." />;
  return (
    <div className="overflow-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.title}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.title}>{c.value(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Statistics() {
  const [period, setPeriod] = useState("7d"),
    [heatScreen, setHeatScreen] = useState(""),
    [seat, setSeat] = useState<Seat | null>(null),
    [day, setDay] = useState(""),
    [filterScreen, setFilterScreen] = useState("");
  const summary = useSuspenseQuery(sq(period)),
    byScreen = useSuspenseQuery(scq(period)),
    byMovie = useSuspenseQuery(mq(period));
  const screeningRows = useQuery(ssq(period, day, filterScreen));
  const screenId = heatScreen || byScreen.data[0]?.screen_id || "";
  const heat = useQuery({
    queryKey: ["statistics", period, "heat", screenId],
    enabled: !!screenId,
    queryFn: () => rpc<Seat[]>("stats_seat_heatmap", { p_period: period, p_screen_id: screenId }),
    retry: false,
  });
  const days = Array.from({ length: period === "today" ? 1 : period === "7d" ? 7 : 30 }, (_, i) =>
    kstDay(new Date(Date.now() - i * 86400000)),
  );
  const s = summary.data[0];
  const cards = [
    { label: "Revenue", value: money(s?.revenue ?? 0) },
    { label: "Screenings", value: s?.screenings ?? 0 },
    { label: "Seats sold", value: s?.sold_seats ?? 0 },
    { label: "Occupancy", value: pct(s?.occupancy_pct) },
    { label: "Cancelled bookings", value: s?.cancelled_bookings ?? 0 },
    { label: "Refunds", value: money(s?.refund_total ?? 0) },
    { label: "Discounted seats", value: s?.discounted_seats ?? 0 },
    { label: "Discount amount", value: money(s?.discount_amount ?? 0) },
  ];
  return (
    <Page title="Statistics">
      <div className="flex flex-wrap justify-between gap-5 items-center mb-8">
        <div className="flex gap-2" role="tablist">
          {[
            { id: "today", label: "Today" },
            { id: "7d", label: "Last 7 days" },
            { id: "30d", label: "Last 30 days" },
          ].map((p) => (
            <Button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              variant={period === p.id ? "default" : "ghost"}
              onClick={() => {
                setPeriod(p.id);
                setDay("");
                setHeatScreen("");
                setSeat(null);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Only screenings that have already ended are counted.
        </p>
      </div>
      <ErrorNotice error={summary.error} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {cards.map((c) => (
          <div key={c.label} className="border border-border rounded-md p-5">
            <p className="text-xs text-muted-foreground mb-3">{c.label}</p>
            <p className="text-2xl font-medium">{c.value}</p>
          </div>
        ))}
      </div>
      <section className="border-t border-border py-9">
        <h2 className="text-2xl mb-6">By screen</h2>
        <ErrorNotice error={byScreen.error} />
        <DataTable<ScreenStats>
          rows={byScreen.data}
          columns={[
            { title: "Screen", value: (r) => r.screen_name },
            { title: "Total seats", value: (r) => r.total_seats },
            { title: "Layout", value: (r) => r.layout },
            { title: "Screenings", value: (r) => r.screenings },
            { title: "Offered seats", value: (r) => r.offered_seats },
            { title: "Sold seats", value: (r) => r.sold_seats },
            { title: "Occupancy", value: (r) => pct(r.occupancy_pct) },
            { title: "Revenue", value: (r) => money(r.revenue) },
            { title: "Cancellation rate", value: (r) => pct(r.cancel_rate_pct) },
            { title: "Isolated-seat ratio", value: (r) => pct(r.isolated_ratio_pct) },
            { title: "Discounted seats", value: (r) => r.discounted_seats },
            { title: "Discount amount", value: (r) => money(r.discount_amount) },
          ]}
        />
      </section>
      <section className="border-t border-border py-9">
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="text-2xl">Seat heatmap</h2>
          <select
            className="select-control max-w-48"
            aria-label="Heatmap screen"
            value={screenId}
            onChange={(e) => {
              setHeatScreen(e.target.value);
              setSeat(null);
            }}
          >
            {byScreen.data.map((sc) => (
              <option key={sc.screen_id} value={sc.screen_id}>
                {sc.screen_name}
              </option>
            ))}
          </select>
        </div>
        <ErrorNotice error={heat.error} />
        {!byScreen.data.length ? (
          <Empty title="No finished screenings in this period." />
        ) : heat.data ? (
          <>
            <SeatMap seats={heat.data} heat onSelect={setSeat} />
            <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground mt-4">
              {["0–<20%", "20–<40%", "40–<60%", "60–<80%", "80–100%"].map((label, i) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="seat-cell inline-block !h-4 !w-4" data-heat={i} />
                  {label}
                </span>
              ))}
            </div>
            {seat && (
              <div className="bg-muted mt-6 p-5 flex flex-wrap gap-7 text-sm">
                <strong>
                  Seat {seat.row_label}
                  {seat.col_no}
                </strong>
                <span>Sold rate: {pct(seat.sold_rate_pct)}</span>
                <span>Cancelled: {seat.cancel_count}</span>
                <span>Isolated: {seat.isolated_count}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Loading seat heatmap…</p>
        )}
      </section>
      <section className="border-t border-border py-9">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl">By screening</h2>
          <div className="flex flex-wrap gap-3">
            <select
              className="select-control max-w-44"
              aria-label="Screening day"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              <option value="">All days</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
            <select
              className="select-control max-w-44"
              aria-label="Screening screen"
              value={filterScreen}
              onChange={(e) => setFilterScreen(e.target.value)}
            >
              <option value="">All screens</option>
              {byScreen.data.map((sc) => (
                <option key={sc.screen_id} value={sc.screen_id}>
                  {sc.screen_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ErrorNotice error={screeningRows.error} />
        <DataTable<ScreeningStats>
          rows={screeningRows.data ?? []}
          columns={[
            { title: "Movie", value: (r) => r.movie_title },
            { title: "Screen", value: (r) => r.screen_name },
            { title: "Starts (KST)", value: (r) => fullTime(r.starts_at) },
            { title: "Offered", value: (r) => r.offered_seats },
            { title: "Sold", value: (r) => r.sold_seats },
            { title: "Cancelled seats", value: (r) => r.cancelled_seats },
            { title: "Occupancy", value: (r) => pct(r.occupancy_pct) },
            { title: "Cancellation rate", value: (r) => pct(r.cancel_rate_pct) },
            { title: "Revenue", value: (r) => money(r.revenue) },
            { title: "Cancelled bookings", value: (r) => r.cancelled_bookings },
            { title: "Refunds", value: (r) => money(r.refund_total) },
            { title: "Isolated seats", value: (r) => r.isolated_seats },
            { title: "Discounted seats", value: (r) => r.discounted_seats },
            { title: "Discount amount", value: (r) => money(r.discount_amount) },
          ]}
        />
      </section>
      <section className="border-t border-border py-9">
        <h2 className="text-2xl mb-6">By movie</h2>
        <ErrorNotice error={byMovie.error} />
        <DataTable<MovieStats>
          rows={byMovie.data}
          columns={[
            { title: "Movie", value: (r) => r.movie_title },
            { title: "Screenings", value: (r) => r.screenings },
            { title: "Offered seats", value: (r) => r.offered_seats },
            { title: "Sold seats", value: (r) => r.sold_seats },
            { title: "Occupancy", value: (r) => pct(r.occupancy_pct) },
            { title: "Revenue", value: (r) => money(r.revenue) },
          ]}
        />
      </section>
    </Page>
  );
}
