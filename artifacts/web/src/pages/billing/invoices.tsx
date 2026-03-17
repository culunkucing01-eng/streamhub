import { useState } from "react";
import { useListInvoices, useUpdateInvoice, useCreateInvoice } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { FileText, Download, CheckCircle2, AlertCircle, Clock, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Invoices() {
  const queryClient = useQueryClient();
  const { data: invoices, isLoading } = useListInvoices();
  const updateMutation = useUpdateInvoice();
  const createMutation = useCreateInvoice();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: 1,
    amount: 0,
    dueDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'pending': return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
      case 'overdue': return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      default: return { icon: FileText, color: 'text-muted-foreground', bg: 'bg-muted/10', border: 'border-border' };
    }
  };

  const markAsPaid = async (id: number) => {
    await updateMutation.mutateAsync({ id, data: { status: "paid" } });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
  };

  const handleCreateInvoice = async () => {
    await createMutation.mutateAsync({
      data: {
        userId: createForm.userId,
        amount: createForm.amount,
        dueDate: new Date(createForm.dueDate).toISOString(),
        description: createForm.description,
      },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
    setShowCreate(false);
    setCreateForm({ userId: 1, amount: 0, dueDate: new Date().toISOString().split("T")[0], description: "" });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground mt-1">Billing history and active invoices.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Invoice
          </button>
        </div>

        <div className="glass rounded-2xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-medium uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices?.map((inv, i) => {
                  const status = getStatusConfig(inv.status);
                  const StatusIcon = status.icon;
                  return (
                    <motion.tr 
                      key={inv.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono text-muted-foreground">INV-{inv.id.toString().padStart(5, '0')}</td>
                      <td className="px-6 py-4 font-medium">{inv.userName || `User #${inv.userId}`}</td>
                      <td className="px-6 py-4 font-bold text-foreground">${inv.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold capitalize tracking-wide", status.bg, status.color, status.border)}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(new Date(inv.dueDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        {inv.status === "pending" && (
                          <button
                            onClick={() => markAsPaid(inv.id)}
                            disabled={updateMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-semibold hover:bg-green-500/20 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
                <h2 className="text-xl font-display font-bold">Create Invoice</h2>
                <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">User ID</label>
                  <input
                    type="number"
                    value={createForm.userId}
                    onChange={(e) => setCreateForm({ ...createForm, userId: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-primary focus:outline-none transition-colors"
                    placeholder="Invoice description"
                  />
                </div>

                <button
                  onClick={handleCreateInvoice}
                  disabled={createMutation.isPending || createForm.amount <= 0}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Invoice
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
