import { createFileRoute, Link } from "@tanstack/react-router";
import { Film, CalendarPlus, Armchair, ArrowUpRight } from "lucide-react";
import { Page } from "@/components/CinemaUI";
import { head } from "@/lib/cinema";
export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => head("Admin", "Manage movies, screenings and screens at Cinema One."),
  component: () => (
    <Page title="Admin">
      <div className="grid md:grid-cols-3 gap-5">
        {[
          {
            title: "Register a movie",
            description: "Add a film to the Cinema One catalogue.",
            to: "/admin/movies" as const,
            Icon: Film,
          },
          {
            title: "Create a screening",
            description: "Set a showtime, screen and ticket price.",
            to: "/admin/screenings" as const,
            Icon: CalendarPlus,
          },
          {
            title: "Theatre setup",
            description: "View seating plans and add a screen.",
            to: "/admin/theatre-setup" as const,
            Icon: Armchair,
          },
        ].map(({ title, description, to, Icon }) => (
          <Link
            key={to}
            to={to}
            className="border border-border rounded-md p-7 hover:border-primary transition-colors"
          >
            <div className="flex justify-between mb-8">
              <Icon className="text-primary" size={28} strokeWidth={1.25} />
              <ArrowUpRight size={18} className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl">{title}</h2>
            <p className="text-sm text-muted-foreground mt-3">{description}</p>
          </Link>
        ))}
      </div>
    </Page>
  ),
});
