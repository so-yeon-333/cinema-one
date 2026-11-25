import { Link } from "@tanstack/react-router";
import { ArrowLeft, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { message } from "@/lib/cinema";
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="form-error py-3">
      {message(error)}
    </p>
  ) : null;
}
export function Empty({
  title = "No screenings scheduled",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-programme">
      <Ticket className="size-8 text-primary mb-5" strokeWidth={1.25} />
      <h3 className="text-2xl mb-2">{title}</h3>
      <div className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {children ?? "The programme for this day is coming soon."}
      </div>
    </div>
  );
}
export function Page({
  title,
  subtitle,
  admin = false,
  children,
}: {
  title: string;
  subtitle?: string;
  admin?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="page-wrap py-10">
      {admin && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"
        >
          <ArrowLeft size={15} />
          Back to Admin
        </Link>
      )}
      <h1 className="page-heading">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-3">{subtitle}</p>}
      <div className="mt-9">{children}</div>
    </main>
  );
}
