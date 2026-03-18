import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv, Loader2, User, Mail, KeyRound } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [urlError, setUrlError] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const { setToken } = useAuth();
  const [, setLocation] = useLocation();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        setLocation("/");
      },
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");
    if (token) {
      setToken(token);
      window.history.replaceState({}, "", window.location.pathname);
      setLocation("/");
    } else if (error) {
      setUrlError("Google login failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");
    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("Password must be at least 8 characters.");
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setToken(data.token);
      setLocation("/");
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-background">
      <div className="absolute inset-0 z-0">
        <img
          src={`${import.meta.env.BASE_URL}images/login-bg.png`}
          alt="Abstract Broadcasting Background"
          className="w-full h-full object-cover opacity-40 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
      </div>

      <div className="flex-1 flex items-center justify-start p-8 sm:p-12 lg:p-24 z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-white text-glow">StreamHub</span>
          </div>

          <div className="glass p-8 rounded-3xl">
            {/* Tabs */}
            <div className="flex rounded-xl bg-secondary/50 p-1 mb-6 gap-1">
              <button
                onClick={() => setTab("login")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setTab("register")}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "register" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create Account
              </button>
            </div>

            <AnimatePresence mode="wait">
              {tab === "login" ? (
                <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <p className="text-muted-foreground mb-6 text-sm">Sign in to manage your broadcasting network.</p>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full mb-5 py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-semibold shadow flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-gray-200"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or sign in with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                        placeholder="admin@streamhub.tv"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    {(loginMutation.isError || urlError) && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                        {urlError || "Invalid credentials. Please try again."}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70"
                    >
                      {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <p className="text-muted-foreground mb-6 text-sm">Create a free account to get started. You can upgrade to a plan anytime.</p>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full mb-5 py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-semibold shadow flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-gray-200"
                  >
                    <GoogleIcon />
                    Register with Google
                  </button>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or register with email</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Full Name
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> Email Address
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5" /> Password
                        </label>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="Min. 8 chars"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Confirm</label>
                        <input
                          type="password"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-foreground placeholder:text-muted-foreground"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    {regError && (
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                        {regError}
                      </div>
                    )}
                    {regSuccess && (
                      <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium">
                        {regSuccess}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg shadow-primary/25 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70"
                    >
                      {regLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Free Account"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
