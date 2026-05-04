import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth-store";
import { useT } from "@/lib/useT";

export default function Login() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const T = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Login — AP e-Procurement";
  }, []);

  if (currentUser) {
    return <Navigate to={currentUser.role === "vendor" ? "/vendor-dashboard" : "/"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const user = await login(email, password);
    if (!user) {
      setError(T("login_invalid"));
      return;
    }
    navigate(user.role === "vendor" ? "/vendor-dashboard" : "/", { replace: true });
  };

  return (
    <main className="min-h-screen bg-secondary/60">
      <div className="border-b-4 border-accent bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white p-1 shadow-md">
              <img src="/ap-govt-logo.png" alt="AP Govt" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-primary-foreground/75">{T("govt_ap")}</p>
              <h1 className="text-base font-bold md:text-xl">{T("portal_tagline")}</h1>
            </div>
          </div>
          <p className="hidden text-xs text-primary-foreground/75 sm:block">{T("login_title")}</p>
        </div>
      </div>

      <section className="mx-auto flex min-h-[calc(100vh-76px)] max-w-md flex-col items-center justify-center px-4 py-8 md:px-8">
        <Card className="w-full rounded-sm border-border p-5 shadow-elegant-lg">
          <div className="mb-5 border-b border-border pb-4">
            <h2 className="text-lg font-bold text-primary">{T("login_title")}</h2>
            <p className="text-xs text-muted-foreground">{T("login_subtitle")}</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{T("login_email")}</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{T("login_password")}</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" required />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" aria-label={showPassword ? T("login_hide_password") : T("login_show_password")}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="rounded-sm bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full rounded-sm bg-accent text-accent-foreground hover:bg-accent/90">
              {T("login_btn")}
            </Button>
            <div className="mt-4 text-center mt-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">{T("login_no_account")}</p>
              <Button type="button" variant="outline" className="w-full rounded-sm" onClick={() => navigate("/vendor-signup")}>
                {T("login_create_account")}
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </main>
  );
}
