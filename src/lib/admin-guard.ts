import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { adminQuery } from "./account";
export async function adminGuard(qc: QueryClient) {
  if (!(await qc.fetchQuery(adminQuery))) throw redirect({ to: "/" });
}
