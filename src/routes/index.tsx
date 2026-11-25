import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, ArrowRight, Clock3, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, ErrorNotice } from "@/components/CinemaUI";
import { rpc, head, dayLabel, timeLabel, money, type Schedule } from "@/lib/cinema";
import auditorium from "@/assets/auditorium.asset.json";
const datesQuery = queryOptions({
  queryKey: ["schedule-dates"],
  queryFn: () => rpc<{ schedule_date: string }[]>("get_schedule_dates"),
  retry: false,
});
const scheduleQuery = (date: string) =>
  queryOptions({
    queryKey: ["schedule", date],
    queryFn: () => rpc<Schedule[]>("get_schedule", { p_date: date }),
    retry: false,
  });
export const Route = createFileRoute("/")({
  head: () =>
    head(
      "Cinema One",
      "Discover the programme and book movie tickets at Cinema One. All showtimes in KST.",
    ),
  loader: async ({ context }) => {
    const dates = await context.queryClient.ensureQueryData(datesQuery);
    const first = dates[0];
    if (first) await context.queryClient.ensureQueryData(scheduleQuery(first.schedule_date));
  },
  component: Index,
});
function Programme({ date }: { date: string }) {
  const { data, error } = useSuspenseQuery(scheduleQuery(date));
  const groups = new Map<string, Schedule[]>();
  data.forEach((s) => groups.set(s.movie_id, [...(groups.get(s.movie_id) ?? []), s]));
  return (
    <>
      <ErrorNotice error={error} />
      {data.length === 0 ? (
        <Empty>
          <p>No showtimes have been added for this date.</p>
          <p>Check back soon for what’s on the big screen.</p>
        </Empty>
      ) : (
        <div className="divide-y divide-border">
          {[...groups.values()].map((rows) => {
            const m = rows[0];
            if (!m) return null;
            return (
              <div key={m.movie_id} className="py-8 grid md:grid-cols-[1fr_1.6fr] gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl">{m.title}</h3>
                    <span className="text-xs border border-border px-2 py-1 rounded-sm">
                      {m.rating}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    {m.genre}
                    <span>·</span>
                    <Clock3 size={14} />
                    {m.running_minutes} min
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {rows.map((s) => (
                    <Button
                      key={s.screening_id}
                      variant="outline"
                      asChild={s.status === "OPEN"}
                      disabled={s.status !== "OPEN"}
                      className="h-auto py-4 px-6 min-w-36 justify-between gap-6"
                    >
                      {s.status === "OPEN" ? (
                        <Link
                          to="/screenings/$screeningId"
                          params={{ screeningId: s.screening_id }}
                        >
                          <span className="text-left">
                            <span className="block text-xs text-muted-foreground mb-1">
                              {s.screen_name}
                            </span>
                            <span className="text-xl font-semibold">{timeLabel(s.starts_at)}</span>
                            <span className="block text-xs text-muted-foreground mt-1">
                              {s.remaining_seats} seats · {money(s.price)}
                            </span>
                          </span>
                          <ArrowRight className="text-primary" />
                        </Link>
                      ) : (
                        <span>
                          {timeLabel(s.starts_at)} · {s.status === "CLOSED" ? "Closed" : "Sold out"}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
function Index() {
  const { data: dates } = useSuspenseQuery(datesQuery);
  const [selected, setSelected] = useState(""),
    [offset, setOffset] = useState(0);
  const date = selected || dates[0]?.schedule_date || "";
  return (
    <>
      <section className="cinema-cover">
        <img
          src={auditorium.url}
          alt="Empty Cinema One auditorium with red seats facing the screen"
        />
        <div className="cover-shade" />
        <div className="cover-content">
          <div className="page-wrap">
            <p className="eyebrow">The big screen awaits</p>
            <h1>Cinema One</h1>
            <p className="text-base max-w-md">Good films. Great seats. Your cinema.</p>
            <a href="#showtimes" className="inline-flex items-center gap-2 text-sm mt-8">
              Explore the programme
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
      <main id="showtimes" className="page-wrap pt-11">
        <div className="flex justify-between items-end gap-4 mb-7">
          <div>
            <p className="eyebrow text-primary mb-2">The programme</p>
            <h2 className="text-4xl">Showtimes</h2>
          </div>
          <span className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 size={14} />
            All showtimes in KST
          </span>
        </div>
        <div className="flex gap-2 border-y border-border py-4 items-center">
          <Button
            variant="ghost"
            size="icon"
            disabled={offset === 0}
            aria-label="Previous dates"
            onClick={() => setOffset(Math.max(0, offset - 7))}
          >
            <ChevronLeft />
          </Button>
          <div className="flex flex-1 gap-2 overflow-auto">
            {dates.slice(offset, offset + 7).map((d, i) => {
              const parts = dayLabel(d.schedule_date).split(", ");
              return (
                <Button
                  key={d.schedule_date}
                  variant={date === d.schedule_date ? "default" : "ghost"}
                  onClick={() => setSelected(d.schedule_date)}
                  className="h-20 min-w-24 flex-col gap-1"
                >
                  <span className="text-[11px] font-normal">
                    {d.schedule_date === dates[0]?.schedule_date ? "Today" : parts[0]}
                  </span>
                  <span className="text-base">{parts[1]}</span>
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={offset + 7 >= dates.length}
            aria-label="Next dates"
            onClick={() => setOffset(offset + 7)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-6">
          <CalendarDays size={16} />
          {date && dayLabel(date)}
          <span className="ml-auto text-xs">
            {dates.length === 1 ? "Today’s programme" : "Choose your cinema day"}
          </span>
        </div>
        {date && <Programme date={date} />}
        <div className="grid sm:grid-cols-3 border-t border-border py-7 gap-6 text-sm">
          <div>
            <p className="font-medium">Three screens. One cinema.</p>
            <p className="text-muted-foreground text-xs mt-2">112, 60 and 40 seats</p>
          </div>
          <div>
            <p className="font-medium">A little more peace of mind.</p>
            <p className="text-muted-foreground text-xs mt-2">
              Full refund until 20 minutes before the film
            </p>
          </div>
          <div>
            <p className="font-medium">The best stories start here.</p>
            <p className="text-muted-foreground text-xs mt-2">Cinema One · Korea Standard Time</p>
          </div>
        </div>
      </main>
    </>
  );
}
