<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Cinema One architecture

- Enforce writes and cross-member reads through SECURITY DEFINER PostgreSQL functions with public search_path; browser code only calls RPCs and public or own-row reads, so database rules remain authoritative.
- Keep shared account queries in src/lib/account.ts, a single account listener in AccountProvider, and a pathless _authenticated.tsx gate; role checks query is_admin and never browser storage.
- Use dedicated TanStack content routes and shared SiteHeader, SeatMap, and CinemaUI components; this keeps seat layout and navigation consistent.
- Initial route data is loaded into TanStack Query; seat-status queries disable automatic refetch and are refreshed only on explicit requests or stale-seat rejections.
- Maintain no-data tests for seat layout and advisory selection rules alongside SQL contract checks; never create test bookings or accounts.
