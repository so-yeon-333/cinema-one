import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Page, ErrorNotice, Empty } from "@/components/CinemaUI";
import { Button } from "@/components/ui/button";
import { movies, screens, rpc, head, kstDay, fullTime, money, type Schedule } from "@/lib/cinema";
const q = queryOptions({
  queryKey: ["screening-options"],
  queryFn: async () => ({ movies: await movies(), screens: await screens() }),
});
export const Route = createFileRoute("/_authenticated/admin/screenings")({
  head: () => head("Create a screening", "Create and manage Cinema One showtimes in KST."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Screenings,
});
function Screenings() {
  const { data } = useSuspenseQuery(q),
    qc = useQueryClient();
  const [day, setDay] = useState(kstDay(new Date())),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const schedule = useQuery({
    queryKey: ["admin-schedule", day],
    queryFn: () => rpc<Schedule[]>("get_schedule", { p_date: day }),
    retry: false,
  });
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const date = String(f.get("date")),
        time = String(f.get("time"));
      await rpc("create_screening", {
        p_movie_id: f.get("movie"),
        p_screen_id: f.get("screen"),
        p_starts_at: `${date}T${time}:00+09:00`,
        p_price: Number(f.get("price")),
      });
      setDay(date);
      await qc.invalidateQueries({ queryKey: ["admin-schedule"] });
      await qc.invalidateQueries({ queryKey: ["schedule-dates"] });
      toast.success("Screening created.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Create a screening" admin>
      <form
        onSubmit={save}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-9 border-b border-border"
      >
        <label className="field">
          Movie
          <select name="movie">
            <option value="">Choose a movie</option>
            {data.movies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Screen
          <select name="screen">
            <option value="">Choose a screen</option>
            {data.screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Ticket price (won)
          <input name="price" type="number" />
        </label>
        <label className="field">
          Start date (KST)
          <input name="date" type="date" defaultValue={day} />
        </label>
        <label className="field">
          Start time (KST)
          <input name="time" type="time" />
        </label>
        <div className="flex items-end">
          <Button disabled={busy || !data.movies.length}>
            <Plus />
            Create screening
          </Button>
        </div>
        <div className="col-span-full">
          <ErrorNotice error={error} />
        </div>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-4 my-8">
        <h2 className="text-2xl">Screening schedule</h2>
        <label className="field">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
      </div>
      <ErrorNotice error={schedule.error} />
      {schedule.data?.length ? (
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Movie</th>
                <th>Screen</th>
                <th>Starts (KST)</th>
                <th>Ends (KST)</th>
                <th>Price</th>
                <th>Seats remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {schedule.data.map((s) => (
                <tr key={s.screening_id}>
                  <td>{s.title}</td>
                  <td>{s.screen_name}</td>
                  <td>{fullTime(s.starts_at)}</td>
                  <td>{fullTime(s.ends_at)}</td>
                  <td>{money(s.price)}</td>
                  <td>{s.remaining_seats}</td>
                  <td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </Page>
  );
}
