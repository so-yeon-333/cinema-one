import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Film, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount, useAdmin, useMember } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";
export function SiteHeader() {
  const { user } = useAccount(),
    admin = useAdmin(),
    member = useMember(),
    qc = useQueryClient(),
    navigate = useNavigate();
  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }
  return (
    <header className="border-b border-border bg-background">
      <div className="page-wrap flex min-h-20 items-center justify-between gap-4 flex-wrap py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Film className="text-primary size-6" />
          <span className="wordmark text-2xl">Cinema One</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link to="/" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>
            Showtimes
          </Link>
          {user && admin.data === true && (
            <>
              <Link to="/admin">Admin</Link>
              <Link to="/statistics">Statistics</Link>
            </>
          )}
          {user && admin.data === false && <Link to="/my-bookings">My bookings</Link>}
          {user && (
            <span className="hidden sm:block text-muted-foreground">{member.data?.name}</span>
          )}
          {user ? (
            <Button variant="ghost" onClick={logout}>
              <LogOut />
              Log out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth" search={{ redirect: "" }}>
                <LogIn />
                Log in
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
