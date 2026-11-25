import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Page, ErrorNotice } from "@/components/CinemaUI";
import { SeatMap } from "@/components/SeatMap";
import { Button } from "@/components/ui/button";
import { head, screens, layoutSeats, rpc, type Seat } from "@/lib/cinema";
import { supabase } from "@/integrations/supabase/client";
const q = queryOptions({ queryKey: ["screens"], queryFn: screens });
export const Route = createFileRoute("/_authenticated/admin/theatre-setup")({
  head: () => head("Theatre setup", "View Cinema One seat maps and add new screens."),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Theatre,
});
function Theatre() {
  const { data } = useSuspenseQuery(q),
    qc = useQueryClient();
  const [chosen, setChosen] = useState(data[0]?.id ?? ""),
    [name, setName] = useState(""),
    [blocks, setBlocks] = useState([
      { rows: 0, cols: 0 },
      { rows: 0, cols: 0 },
      { rows: 0, cols: 0 },
    ]),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const plan = useQuery({
    queryKey: ["screen-seats", chosen],
    enabled: !!chosen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seat")
        .select("*")
        .eq("screen_id", chosen)
        .order("row_index")
        .order("col_no");
      if (error) throw error;
      return data.map((s) => ({ ...s, seat_id: s.id }));
    },
  });
  const valid = blocks.every(
      (b) =>
        Number.isInteger(b.rows) &&
        b.rows >= 0 &&
        b.rows <= 30 &&
        Number.isInteger(b.cols) &&
        (b.cols === 0 || (b.cols >= 2 && b.cols <= 20)),
    ),
    preview = valid ? layoutSeats(blocks) : [],
    max = Math.max(0, ...blocks.filter((b) => b.rows > 0).map((b) => b.cols));
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await rpc<{ screen_id: string; seats_created: number; max_seats: number }[]>(
        "configure_screen",
        {
          p_name: name,
          p_b1_rows: blocks[0]?.rows ?? 0,
          p_b1_cols: blocks[0]?.cols ?? 0,
          p_b2_rows: blocks[1]?.rows ?? 0,
          p_b2_cols: blocks[1]?.cols ?? 0,
          p_b3_rows: blocks[2]?.rows ?? 0,
          p_b3_cols: blocks[2]?.cols ?? 0,
        },
      );
      const row = result[0];
      toast.success(`Screen ${name.trim()} created with ${row?.seats_created ?? 0} seats.`);
      await qc.invalidateQueries({ queryKey: ["screens"] });
      await qc.invalidateQueries({ queryKey: ["screening-options"] });
      if (row) setChosen(row.screen_id);
      setName("");
      setBlocks([
        { rows: 0, cols: 0 },
        { rows: 0, cols: 0 },
        { rows: 0, cols: 0 },
      ]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title="Theatre setup" admin>
      <div className="overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Screen</th>
              <th>Block 1</th>
              <th>Block 2</th>
              <th>Block 3</th>
              <th>Seats</th>
              <th>Maximum per booking</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id}>
                <td>
                  <Button
                    variant={chosen === s.id ? "secondary" : "ghost"}
                    onClick={() => setChosen(s.id)}
                  >
                    {s.name}
                  </Button>
                </td>
                <td>
                  {s.block1_rows} × {s.block1_cols}
                </td>
                <td>
                  {s.block2_rows} × {s.block2_cols}
                </td>
                <td>
                  {s.block3_rows} × {s.block3_cols}
                </td>
                <td>{s.seat.length}</td>
                <td>
                  {Math.max(
                    s.block1_rows ? s.block1_cols : 0,
                    s.block2_rows ? s.block2_cols : 0,
                    s.block3_rows ? s.block3_cols : 0,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2 className="text-2xl mt-9">{data.find((s) => s.id === chosen)?.name} seating plan</h2>
      <ErrorNotice error={plan.error} />
      <SeatMap seats={plan.data ?? []} />
      <section className="border-t border-border pt-9 mt-8">
        <h2 className="text-2xl mb-6">Add screen</h2>
        <div className="grid lg:grid-cols-[380px_1fr] gap-12">
          <form onSubmit={save} className="grid gap-5">
            <label className="field">
              Screen name
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <small>1 to 20 characters</small>
            </label>
            {blocks.map((b, i) => (
              <div key={i}>
                <p className="text-sm font-medium mb-3">Block {i + 1}</p>
                <div className="grid grid-cols-2 gap-4">
                  {(["rows", "cols"] as const).map((key) => (
                    <label className="field" key={key}>
                      {key === "cols" ? "Columns" : "Rows"}
                      <input
                        type="number"
                        value={b[key]}
                        onChange={(e) =>
                          setBlocks(
                            blocks.map((v, j) =>
                              i === j ? { ...v, [key]: Number(e.target.value) } : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rows 0–30, columns 0 or 2–20. A block with 0 rows or 0 columns is empty. At least one
              block must have seats.
            </p>
            <ErrorNotice error={error} />
            <Button disabled={busy}>
              <Plus />
              {busy ? "Creating…" : "Add screen"}
            </Button>
          </form>
          <div className="min-w-0">
            <h3 className="text-xl">Seating preview</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {preview.length} seats · Maximum {valid ? max : "—"} per booking
            </p>
            {valid && preview.length > 0 ? (
              <SeatMap seats={preview} />
            ) : (
              <p className="text-sm text-muted-foreground mt-12">
                {valid ? "No seats yet." : "Enter valid block sizes to see the preview."}
              </p>
            )}
          </div>
        </div>
      </section>
    </Page>
  );
}
