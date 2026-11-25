import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Movie = Database["public"]["Tables"]["movie"]["Row"];
export type Screen = Database["public"]["Tables"]["screen"]["Row"];
export type Seat = {
  seat_id: string;
  row_label: string;
  row_index: number;
  col_no: number;
  block_no: number;
  status?: string;
  is_isolated?: boolean;
  price?: number;
  starts_at?: string;
  max_seats?: number;
  discount_active?: boolean;
  discount_pct?: number;
  screening_started?: boolean;
  sold_rate_pct?: number | null;
  sold_count?: number;
  cancel_count?: number;
  isolated_count?: number;
};
export type Schedule = {
  screening_id: string;
  movie_id: string;
  title: string;
  rating: string;
  genre: string;
  running_minutes: number;
  screen_name: string;
  starts_at: string;
  ends_at: string;
  price: number;
  remaining_seats: number;
  status: string;
};
export function message(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";
  const match = raw.match(/\b[A-Z][A-Z_]+:\s*([\s\S]*)/);
  return match?.[1] ?? "Something went wrong. Please try again.";
}
export function errorCode(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  return raw.match(/\b([A-Z][A-Z_]+):/)?.[1] ?? "";
}
export async function rpc<T>(
  name: keyof Database["public"]["Functions"],
  args: Record<string, unknown> = {},
) {
  const { data, error } = await supabase.rpc(name, args as never);
  if (error) throw new Error(error.message);
  return data as unknown as T;
}
export async function movies() {
  const { data, error } = await supabase.from("movie").select("*").order("title");
  if (error) throw error;
  return data;
}
export async function screens() {
  const { data, error } = await supabase.from("screen").select("*, seat(id)").order("name");
  if (error) throw error;
  return data;
}
export const money = (n: number) => "₩" + n.toLocaleString("en-US");
export const kstDay = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const dayLabel = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value.length === 10 ? value + "T00:00:00+09:00" : value));
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
export const fullTime = (value: string) => `${dayLabel(value)}, ${timeLabel(value)} KST`;
export const head = (title: string, description: string) => ({
  meta: [
    { title: title === "Cinema One" ? title : `${title} | Cinema One` },
    { name: "description", content: description },
    { property: "og:title", content: title === "Cinema One" ? title : `${title} | Cinema One` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
});
export function rowLabel(index: number) {
  let n = index,
    label = "";
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}
export function layoutSeats(blocks: { rows: number; cols: number }[]): Seat[] {
  let offset = 0;
  return blocks.flatMap((b, i) => {
    if (b.rows < 1 || b.cols < 1) return [];
    const seats = Array.from({ length: b.rows }, (_, r) =>
      Array.from({ length: b.cols }, (_, c) => ({
        seat_id: `${i}-${r}-${c}`,
        row_label: rowLabel(r + 1),
        row_index: r + 1,
        col_no: offset + c + 1,
        block_no: i + 1,
      })),
    ).flat();
    offset += b.cols;
    return seats;
  });
}
export function newIsolated(seats: Seat[], selected: string[]) {
  const booked = new Set(seats.filter((s) => s.status === "BOOKED").map((s) => s.seat_id));
  const isolated = (assume: Set<string>) =>
    new Set(
      seats
        .filter(
          (s) =>
            !assume.has(s.seat_id) &&
            [-1, 1].every((d) => {
              const neighbour = seats.find(
                (n) =>
                  n.block_no === s.block_no &&
                  n.row_index === s.row_index &&
                  n.col_no === s.col_no + d,
              );
              return !neighbour || assume.has(neighbour.seat_id);
            }),
        )
        .map((s) => s.seat_id),
    );
  const before = isolated(booked);
  return [...isolated(new Set([...booked, ...selected]))].filter((id) => !before.has(id)).length;
}
export function selectionError(seats: Seat[], selected: string[], max: number) {
  if (selected.length > max) return `You can book up to ${max} seats at a time in this screen.`;
  const chosen = seats
      .filter((s) => selected.includes(s.seat_id))
      .sort((a, b) => a.col_no - b.col_no),
    first = chosen[0];
  if (
    first &&
    chosen.some(
      (s, i) =>
        s.row_index !== first.row_index ||
        s.block_no !== first.block_no ||
        s.col_no !== first.col_no + i,
    )
  )
    return "Seats booked together must be next to each other in the same row, with no aisle between them.";
  if (newIsolated(seats, selected) >= 2)
    return "This selection would leave two or more isolated seats (single empty seats between booked seats, aisles or walls). Please choose other seats.";
  return "";
}
export const estimate = (seat: Seat) =>
  seat.discount_active && seat.is_isolated
    ? Math.round(((seat.price ?? 0) * (100 - (seat.discount_pct ?? 20))) / 100)
    : (seat.price ?? 0);
