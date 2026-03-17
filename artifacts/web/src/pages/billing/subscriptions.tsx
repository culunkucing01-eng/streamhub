import { useState } from "react";
import { useListSubscriptions, useCreateSubscription, useListPlans, useListChannels } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CreditCard, Zap, Tv, Plus, X, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Subscriptions() {
  const queryClient = useQueryClient();
  const { data: subs, isLoading } = useListSubscriptions();
  const { data: plans } = useListPlans();
  const { data: channels } = useListChannels();
  const createMutation = useCreateSubscription();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ userId: 1, planId: 0, channelId: undefined as number | undefined });

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      data: {
        userId: form.userId,
        planId: form.planId,
        channelId: form.channelId,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/subscriptions"] });
    setShowCreate(false);
    setForm({ userId: 1, planId: 0, channelId: undefined });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Active Subscriptions</h1>
            <p className="text-muted-foreground mt-1">Manage user channel rentals and plan enrollments.</p>
          </div>
          <button
            onClick={() => {
              if (plans && plans.length > 0) {
                setForm({ ...form, planId: plans[0].id });
              }
              setShowCreate(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            New Subscription
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : subs?.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/20">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">Create a new subscription to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {subs?.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-6 border border-border/50 flex flex-col relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-display font-bold text-xl">{sub.userName || `User #${sub.userId}`}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-green-500/20 text-green-500 border border-green-500/30 uppercase tracking-wider">
                        {sub.status}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                </div>

                <div className="space-y-4 bg-background/50 p-4 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Zap className="w-4 h-4" /> Plan Tier
                    </div>
                    <span className="font-medium">{sub.planName || `Plan #${sub.planId}`}</span>
                  </div>
                  
                  {sub.channelId && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Tv className="w-4 h-4" /> Assigned Channel
                      </div>
                      <span className="font-medium">{sub.channelName || `Ch #${sub.channelId}`}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
                  <span>Started: {format(new Date(sub.startDate), 'MMM d, yyyy')}</span>
                  <span>Renews: {format(new Date(sub.endDate), 'MMM d, yyyy')}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-md border border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold">New Subscription</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <input
                    type="number"
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select
                    value={form.planId}
                    onChange={(e) => setForm({ ...form, planId: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value={0} disabled>Select a plan</option>
                    {plans?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - ${p.price}/{p.interval === "monthly" ? "mo" : "yr"}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Channel (optional)</label>
                  <select
                    value={form.channelId || ""}
                    onChange={(e) => setForm({ ...form, channelId: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="">No channel</option>
                    {channels?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!form.planId || createMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Subscription
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
