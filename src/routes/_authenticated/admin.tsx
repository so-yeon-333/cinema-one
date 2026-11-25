import { createFileRoute, Outlet } from "@tanstack/react-router";
import { adminGuard } from "@/lib/admin-guard";
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => adminGuard(context.queryClient),
  component: () => <Outlet />,
});
