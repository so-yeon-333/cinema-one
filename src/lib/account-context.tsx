import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "./cinema";
export const adminQuery = queryOptions({
  queryKey: ["account", "admin"],
  queryFn: () => rpc<boolean>("is_admin"),
  staleTime: 60000,
  retry: false,
});
const Context = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
      void qc.invalidateQueries({ queryKey: ["account"] });
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);
  return <Context.Provider value={{ user, ready }}>{children}</Context.Provider>;
}
export const useAccount = () => useContext(Context);
export function useAdmin() {
  const { user, ready } = useAccount();
  return useQuery({ ...adminQuery, enabled: ready && !!user });
}
export function useMember() {
  const { user } = useAccount();
  return useQuery({
    queryKey: ["account", "member", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("member")
        .select("name")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
