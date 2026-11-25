import { Button } from "@/components/ui/button";
import type { Seat } from "@/lib/cinema";
export function SeatMap({
  seats,
  selected = [],
  discount = false,
  onSelect,
  heat = false,
}: {
  seats: Seat[];
  selected?: string[];
  discount?: boolean;
  onSelect?: (s: Seat) => void;
  heat?: boolean;
}) {
  return (
    <div className="seat-map-scroll">
      <div className="seat-map">
        <div className="screen-bar" />
        <p className="text-center text-xs text-muted-foreground">SCREEN</p>
        <div className="seat-grid">
          {[1, 2, 3].map((block) => {
            const blockSeats = seats.filter((s) => s.block_no === block);
            if (!blockSeats.length) return null;
            const rows = [...new Set(blockSeats.map((s) => s.row_index))].sort((a, b) => a - b);
            return (
              <div key={block} className="seat-block">
                {rows.map((row) => (
                  <div className="seat-row" key={row}>
                    {blockSeats
                      .filter((s) => s.row_index === row)
                      .sort((a, b) => a.col_no - b.col_no)
                      .map((s) => (
                        <Button
                          key={s.seat_id}
                          variant="outline"
                          className="seat-cell"
                          data-state={
                            selected.includes(s.seat_id)
                              ? "selected"
                              : s.status === "BOOKED"
                                ? "BOOKED"
                                : discount && s.is_isolated
                                  ? "discount"
                                  : "available"
                          }
                          data-heat={
                            heat ? Math.min(4, Math.floor((s.sold_rate_pct ?? 0) / 20)) : undefined
                          }
                          aria-label={`${s.row_label}${s.col_no}${s.status === "BOOKED" ? ", booked" : ""}`}
                          aria-pressed={selected.includes(s.seat_id)}
                          title={
                            heat
                              ? `${s.row_label}${s.col_no}: ${s.sold_rate_pct?.toFixed(1) ?? "—"}% sold`
                              : undefined
                          }
                          disabled={!onSelect || s.status === "BOOKED"}
                          onClick={() => onSelect?.(s)}
                        >
                          {s.row_label}
                          {s.col_no}
                        </Button>
                      ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
