import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  layoutSeats,
  rowLabel,
  selectionError,
  newIsolated,
  estimate,
  kstDay,
  timeLabel,
  errorCode,
  message,
} from "@/lib/cinema";
const sql = (n: string) => readFileSync(`drizzle/migrations/${n}.sql`, "utf8");
const foundation = sql("0000_cinema_one_foundation");
const schedule = sql("0001_movie_screening_schedule");
const history = sql("0002_history_refunds_theatre_setup");
const booking = sql("0003_seat_booking_mock_payment");
const stats = sql("0004_administrator_sales_statistics");
const blocks = [
  { rows: 8, cols: 2 },
  { rows: 8, cols: 10 },
  { rows: 8, cols: 2 },
];
describe("Cinema One layout and advisory booking checks (no database writes)", () => {
  it("labels rows A, Z, AA and BA", () =>
    expect([1, 26, 27, 53].map(rowLabel)).toEqual(["A", "Z", "AA", "BA"]));
  it("generates the three requested capacities", () =>
    expect([
      layoutSeats(blocks).length,
      layoutSeats([
        { rows: 6, cols: 2 },
        { rows: 6, cols: 6 },
        { rows: 6, cols: 2 },
      ]).length,
      layoutSeats([
        { rows: 5, cols: 2 },
        { rows: 5, cols: 4 },
        { rows: 5, cols: 2 },
      ]).length,
    ]).toEqual([112, 60, 40]));
  it("aligns block rows at the front and uses continuous columns", () => {
    const s = layoutSeats([
      { rows: 1, cols: 2 },
      { rows: 2, cols: 4 },
      { rows: 0, cols: 2 },
    ]);
    expect(s.filter((v) => v.row_index === 1).map((v) => v.col_no)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(s.filter((v) => v.row_index === 2).map((v) => v.col_no)).toEqual([3, 4, 5, 6]);
  });
  it("never treats opposite sides of an aisle as adjacent", () => {
    const s = layoutSeats(blocks);
    const a = s.find((v) => v.row_index === 1 && v.col_no === 2),
      b = s.find((v) => v.row_index === 1 && v.col_no === 3);
    if (!a || !b) throw new Error("Missing seats");
    expect(selectionError(s, [a.seat_id, b.seat_id], 10)).toContain("no aisle");
  });
  it("checks the maximum before contiguity", () => {
    const s = layoutSeats(blocks);
    expect(
      selectionError(
        s,
        s.slice(0, 11).map((v) => v.seat_id),
        10,
      ),
    ).toBe("You can book up to 10 seats at a time in this screen.");
  });
  it("rejects two newly isolated seats", () => {
    const s = layoutSeats([{ rows: 1, cols: 4 }]);
    expect(newIsolated(s, [s[1]?.seat_id ?? "", s[2]?.seat_id ?? ""])).toBe(2);
    expect(selectionError(s, [s[1]?.seat_id ?? "", s[2]?.seat_id ?? ""], 4)).toContain(
      "two or more isolated",
    );
  });
  it("does not count seats that were already isolated", () => {
    const s = layoutSeats([{ rows: 1, cols: 4 }]).map((v, i) => ({
      ...v,
      status: i === 1 ? "BOOKED" : "AVAILABLE",
    }));
    expect(newIsolated(s, [s[3]?.seat_id ?? ""])).toBe(1);
  });
  it("estimates a constant 20 percent isolated-seat discount and rounds won", () => {
    const seat = layoutSeats([{ rows: 1, cols: 2 }])[0];
    if (!seat) throw new Error("Missing seat");
    expect(
      estimate({
        ...seat,
        price: 12001,
        is_isolated: true,
        discount_active: true,
        discount_pct: 20,
      }),
    ).toBe(9601);
    expect(estimate({ ...seat, price: 12001, is_isolated: true, discount_active: false })).toBe(
      12001,
    );
  });
  it("uses KST rather than the browser timezone", () => {
    expect(kstDay("2026-11-25T15:00:00Z")).toBe("2026-11-26");
    expect(timeLabel("2026-11-25T15:00:00Z")).toBe("00:00");
  });
  it("extracts database codes without exposing raw errors", () => {
    const e = new Error("SEAT_TAKEN: Choose seats again.");
    expect(errorCode(e)).toBe("SEAT_TAKEN");
    expect(message(e)).toBe("Choose seats again.");
    expect(message(new Error("private auth error"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
describe("PostgreSQL business-rule contracts", () => {
  it("keeps exactly eight RLS protected tables and no direct writes", () => {
    expect((foundation.match(/CREATE TABLE public\./g) ?? []).length).toBe(8);
    expect((foundation.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length).toBe(8);
    expect(foundation).not.toMatch(/CREATE POLICY .* FOR (INSERT|UPDATE|DELETE)/);
  });
  it("never takes a signup role from metadata", () => {
    expect(foundation).toContain("VALUES(NEW.id,'MEMBER')");
    expect(foundation).not.toContain("raw_user_meta_data->>'role'");
    expect(foundation).toContain("length(v_name)>30");
  });
  it("serializes screenings and permits exact end-to-start boundaries", () => {
    expect(schedule).toContain("pg_advisory_xact_lock(hashtext(p_screen_id::text))");
    expect(schedule).toContain("p_starts_at<ss.ends_at AND ss.starts_at<v_end");
  });
  it("cancellation accepts the exact 20-minute deadline", () => {
    expect(history).toContain("IF now()>v_start-interval '20 minutes'");
    expect(history).toContain("now()<=ss.starts_at-interval '20 minutes'");
  });
  it("updates the booking before deactivating seats with the same booking lock", () => {
    expect(history.indexOf("UPDATE public.booking b")).toBeLessThan(
      history.indexOf("UPDATE public.booking_seat bs"),
    );
    expect(history).toContain("pg_advisory_xact_lock(hashtext(v_booking.screening_id::text))");
    expect(booking).toContain("pg_advisory_xact_lock(hashtext(p_screening_id::text))");
  });
  it("fully refunds the server-recorded amount", () =>
    expect(history).toContain("refund_amount=b.total_amount WHERE b.id=p_booking_id"));
  it("validates block bounds 0–30 rows and 0 or 2–20 columns", () => {
    expect(history).toContain("p_b1_rows NOT BETWEEN 0 AND 30");
    expect(history).toContain("p_b1_cols=0 OR p_b1_cols BETWEEN 2 AND 20");
    expect(history).toContain("public.generate_seats(v_id)");
  });
  it("discounts only strictly inside the last 20 minutes using server prices", () => {
    expect(booking).toContain(
      "now()>v_screening.starts_at-interval '20 minutes' AND now()<v_screening.starts_at",
    );
    expect(booking).toContain("round(v_screening.price*(100-20)/100.0)");
    expect(booking).not.toMatch(/p_(price|total_amount)/);
  });
  it("rejects administrator bookings and two new isolated seats", () => {
    expect(booking).toContain("ADMIN_CANNOT_BOOK:");
    expect(booking).toContain("count_new_isolated_seats(p_screening_id,p_seat_ids)>=2");
  });
  it("counts only finished screenings in KST calendar periods", () => {
    expect(stats).toContain("ss.ends_at<=now()");
    expect(stats).toContain(
      "(ss.starts_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN v_today-(v_days-1) AND v_today",
    );
    expect(stats).toContain("WHEN 'today' THEN 1 WHEN '7d' THEN 7 ELSE 30");
  });
  it("uses weighted occupancy and null zero-denominator percentages", () =>
    expect(stats).toContain(
      "round(sum(r.sold_seats)::numeric/nullif(sum(r.offered_seats),0)*100,1)",
    ));
  it("never exposes identities through statistics", () => {
    const outputs = [...stats.matchAll(/RETURNS TABLE\(([^)]*)\)/g)].map((m) => m[1]);
    expect(outputs).toHaveLength(6);
    for (const output of outputs)
      expect(output).not.toMatch(/member_id|booking_id|booking_no|email/);
  });
});
