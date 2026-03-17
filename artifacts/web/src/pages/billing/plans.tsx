import { useState } from "react";
import { useListPlans, useCreatePlan, useUpdatePlan, useDeletePlan } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Server, Activity, X, Trash2, Edit2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  interval: "monthly" | "yearly";
  maxChannels: number;
  maxBitrate: number;
  features: string[];
}

const defaultFormData: PlanFormData = {
  name: "",
  description: "",
  price: 9.99,
  interval: "monthly",
  maxChannels: 1,
  maxBitrate: 4000,
  features: [],
};

export default function Plans() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useListPlans();
  const createMutation = useCreatePlan();
  const deleteMutation = useDeletePlan();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<PlanFormData>(defaultFormData);
  const [featureInput, setFeatureInput] = useState("");

  const handleCreate = async () => {
    await createMutation.mutateAsync({ data: { ...form } });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
    setShowModal(false);
    setForm(defaultFormData);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/plans"] });
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...form.features, featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Subscription Plans</h1>
            <p className="text-muted-foreground mt-1">Manage tiers and pricing for channel rentals.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Plan
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans?.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-3xl p-8 border border-border/50 relative overflow-hidden flex flex-col"
              >
                {plan.name.toLowerCase().includes('pro') && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-xl uppercase tracking-wider">
                    Popular
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-bold text-2xl">{plan.name}</h3>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-muted-foreground text-sm min-h-[40px]">{plan.description}</p>
                
                <div className="my-6">
                  <span className="text-5xl font-display font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>

                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Server className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="font-medium">Up to {plan.maxChannels} Channels</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="font-medium">Max {plan.maxBitrate ? `${plan.maxBitrate / 1000} Mbps` : 'Unlimited'} Bitrate</span>
                  </div>
                  
                  <div className="w-full h-px bg-border/50 my-4" />
                  
                  {plan.features?.map((feat, j) => (
                    <div key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-lg border border-border/50 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display font-bold">Create New Plan</h2>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    placeholder="e.g. Pro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    placeholder="Plan description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Interval</label>
                    <select
                      value={form.interval}
                      onChange={(e) => setForm({ ...form, interval: e.target.value as "monthly" | "yearly" })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Channels</label>
                    <input
                      type="number"
                      value={form.maxChannels}
                      onChange={(e) => setForm({ ...form, maxChannels: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Bitrate (kbps)</label>
                    <input
                      type="number"
                      value={form.maxBitrate}
                      onChange={(e) => setForm({ ...form, maxBitrate: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Features</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={featureInput}
                      onChange={(e) => setFeatureInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="Add a feature"
                    />
                    <button onClick={addFeature} className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {form.features.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {form.features.map((feat, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                          <span>{feat}</span>
                          <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!form.name || createMutation.isPending}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
