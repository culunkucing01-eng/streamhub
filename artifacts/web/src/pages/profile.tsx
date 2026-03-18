import { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Mail, Shield, Calendar, KeyRound, CheckCheck, AlertCircle, Chrome, Loader2, Pencil } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user, setToken } = useAuth();
  const queryClient = useQueryClient();

  const [nameValue, setNameValue] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const token = localStorage.getItem("token");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMessage({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }

    const body: Record<string, string> = {};
    if (nameValue.trim() && nameValue !== user?.name) body.name = nameValue.trim();
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (Object.keys(body).length === 0) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-500/20 text-red-400 border-red-500/30",
      operator: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return colors[role || "user"] || colors.user;
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account information and security settings.</p>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-border/50 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/10 relative">
            <div className="absolute -bottom-10 left-6">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl border-4 border-background shadow-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-background shadow-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-14 px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold">{user?.name}</h2>
                <p className="text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start ${getRoleBadge(user?.role)}`}>
                {user?.role}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <Shield className="w-5 h-5 text-accent flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Access Level</p>
                  <p className="text-sm font-medium capitalize">{user?.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/30">
                <Calendar className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                  <p className="text-sm font-medium">
                    {user?.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                  </p>
                </div>
              </div>
            </div>

            {(user as { googleId?: string })?.googleId && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Chrome className="w-4 h-4 text-blue-400" />
                <p className="text-sm text-blue-400 font-medium">Connected via Google account</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Edit Profile Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-border/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Pencil className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-bold">Edit Profile</h3>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-muted-foreground" /> Display Name
              </label>
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="Your full name"
              />
            </div>

            {/* Email - readonly */}
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                readOnly
                className="w-full px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/50 text-muted-foreground outline-none cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
            </div>

            {/* Password Change */}
            {!(user as { googleId?: string })?.googleId && (
              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Change Password</h4>
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium border ${
                message.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}>
                {message.type === "success" ? <CheckCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}
