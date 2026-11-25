import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { head } from "@/lib/cinema";
export const Route = createFileRoute("/auth")({
  head: () => head("Log in", "Log in or create your Cinema One member account."),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect:
      typeof s["redirect"] === "string" &&
      s["redirect"].startsWith("/") &&
      !s["redirect"].startsWith("//")
        ? s["redirect"]
        : "",
  }),
  component: Auth,
});
function Auth() {
  const search = Route.useSearch(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const [tab, setTab] = useState<"login" | "signup">("login"),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [nameError, setNameError] = useState(""),
    [passError, setPassError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [duplicate, setDuplicate] = useState(false);
  function clear() {
    setError("");
    setNameError("");
    setPassError("");
    setDuplicate(false);
  }
  function switchTab(t: "login" | "signup") {
    setTab(t);
    clear();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clear();
    if (tab === "signup") {
      let invalid = false;
      if (!name.trim() || name.trim().length > 30) {
        setNameError("Name must have 1 to 30 characters.");
        invalid = true;
      }
      if (password.length < 6) {
        setPassError("Password must be at least 6 characters.");
        invalid = true;
      }
      if (invalid) return;
    }
    setBusy(true);
    try {
      const result =
        tab === "login"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { data: { name: name.trim() } },
            });
      if (result.error) {
        if (tab === "login") setError("The email or password is incorrect.");
        else if (/already|registered/i.test(result.error.message)) {
          setError("This email address is already registered.");
          setDuplicate(true);
        } else if (/weak|leak|pwn|password/i.test(result.error.message))
          setPassError("This password is too easy to guess. Please choose a different one.");
        else if (/database|NAME_INVALID/i.test(result.error.message))
          setNameError("Name must have 1 to 30 characters.");
        else setError("Please enter a valid email address and try again.");
        return;
      }
      if (tab === "signup" && result.data.user?.identities?.length === 0) {
        setError("This email address is already registered.");
        setDuplicate(true);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["account"] });
      await navigate({ to: search.redirect || "/" });
    } catch {
      setError(
        tab === "login"
          ? "The email or password is incorrect."
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page-wrap min-h-[650px] flex justify-center py-14">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-primary mb-4">Your next cinema night</p>
        <h1 className="page-heading">{tab === "login" ? "Welcome back" : "Join Cinema One"}</h1>
        <p className="text-muted-foreground text-sm mt-3">
          {search.redirect ? "Please log in to continue." : "A seat for your next favourite story."}
        </p>
        <div className="flex border-b border-border my-8" role="tablist">
          {(["login", "signup"] as const).map((t) => (
            <Button
              key={t}
              role="tab"
              aria-selected={tab === t}
              variant="ghost"
              onClick={() => switchTab(t)}
              className={`flex-1 rounded-none border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </Button>
          ))}
        </div>
        <form noValidate onSubmit={submit} className="grid gap-5">
          {tab === "signup" && (
            <label className="field">
              Name
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clear();
                }}
                autoComplete="name"
              />
              <small>1 to 30 characters after trimming</small>
              {nameError && <span className="form-error">{nameError}</span>}
            </label>
          )}
          <label className="field">
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clear();
              }}
              autoComplete="email"
            />
          </label>
          <label className="field">
            Password
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clear();
                }}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1"
                title={show ? "Hide password" : "Show password"}
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            {tab === "signup" && <small>At least 6 characters</small>}
            {passError && <span className="form-error">{passError}</span>}
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {duplicate && (
            <Button type="button" variant="outline" onClick={() => switchTab("login")}>
              Switch to Log in
            </Button>
          )}
          <Button size="lg" disabled={busy}>
            {busy ? "Please wait…" : tab === "login" ? "Log in" : "Create account"}
            <ArrowRight />
          </Button>
          {tab === "signup" && (
            <p className="text-xs text-muted-foreground text-center">
              New accounts are always member accounts.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
