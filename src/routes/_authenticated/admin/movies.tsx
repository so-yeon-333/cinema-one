import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Page, ErrorNotice, Empty } from "@/components/CinemaUI";
import { Button } from "@/components/ui/button";
import { movies, rpc, head } from "@/lib/cinema";
const q = queryOptions({ queryKey: ["movies"], queryFn: movies });
export const Route = createFileRoute("/_authenticated/admin/movies")({
  head: () => head("Register a movie", "Register films in the Cinema One movie catalogue."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Movies,
});
function Movies() {
  const { data } = useSuspenseQuery(q),
    qc = useQueryClient();
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      await rpc("create_movie", {
        p_title: f.get("title"),
        p_rating: f.get("rating"),
        p_running_minutes: Number(f.get("minutes")),
        p_genre: f.get("genre"),
      });
      form.reset();
      await qc.invalidateQueries({ queryKey: ["movies"] });
      toast.success("Movie registered.");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Register a movie" admin>
      <form onSubmit={save} className="grid md:grid-cols-4 gap-5 pb-9 border-b border-border">
        <label className="field md:col-span-2">
          Movie title
          <input name="title" />
        </label>
        <label className="field">
          Rating
          <select name="rating">
            {["ALL", "12", "15", "19"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Running time (minutes)
          <input name="minutes" type="number" />
        </label>
        <label className="field md:col-span-2">
          Genre
          <input name="genre" />
        </label>
        <div className="md:col-span-2 flex items-end">
          <Button disabled={busy}>
            <Plus />
            Register movie
          </Button>
        </div>
        <div className="md:col-span-4">
          <ErrorNotice error={error} />
        </div>
      </form>
      <h2 className="text-2xl mt-9 mb-5">
        Movie catalogue{" "}
        <span className="font-sans text-sm text-muted-foreground">({data.length})</span>
      </h2>
      {data.length ? (
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Movie</th>
                <th>Rating</th>
                <th>Genre</th>
                <th>Running time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{m.rating}</td>
                  <td>{m.genre}</td>
                  <td>{m.running_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No movies registered yet">Your registered movies will appear here.</Empty>
      )}
    </Page>
  );
}
