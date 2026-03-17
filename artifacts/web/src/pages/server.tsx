import { useGetServerStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Server, Cpu, MemoryStick, Network, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ServerMonitor() {
  const { data: stats, isLoading } = useGetServerStats({
    query: { queryKey: ["/api/server/stats"], refetchInterval: 2000 }
  });

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (usage?: number) => {
    if (!usage) return 'text-green-500';
    if (usage > 85) return 'text-red-500';
    if (usage > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Server className="w-8 h-8 text-primary" />
              Server Status
            </h1>
            <p className="text-muted-foreground mt-1">Real-time hardware metrics and SRS node status.</p>
          </div>
          
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-3 border border-border/50">
            <span className="text-sm font-medium text-muted-foreground">SRS Core Node</span>
            {stats?.srsConnected ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-green-500">
                <CheckCircle2 className="w-4 h-4" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-bold text-red-500">
                <AlertTriangle className="w-4 h-4" /> Offline
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CPU Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-6 rounded-3xl border border-border/50 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
                <Cpu className="w-6 h-6 text-accent" />
              </div>
              <span className="text-sm font-mono text-muted-foreground">{stats?.cpu.model || 'Unknown CPU'} ({stats?.cpu.cores || 0} Cores)</span>
            </div>
            
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">CPU Usage</h3>
              <span className={`text-4xl font-display font-bold ${getStatusColor(stats?.cpu.usage)}`}>
                {stats?.cpu.usage?.toFixed(1) || 0}%
              </span>
            </div>
            
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${stats?.cpu.usage || 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Memory Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6 rounded-3xl border border-border/50 relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
                <MemoryStick className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-mono text-muted-foreground">{formatBytes(stats?.memory.used)} / {formatBytes(stats?.memory.total)}</span>
            </div>
            
            <div className="flex items-end justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">RAM Usage</h3>
              <span className={`text-4xl font-display font-bold ${getStatusColor(stats?.memory.usagePercent)}`}>
                {stats?.memory.usagePercent?.toFixed(1) || 0}%
              </span>
            </div>
            
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${stats?.memory.usagePercent || 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Network Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6 rounded-3xl border border-border/50 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-secondary/50 rounded-xl border border-border/50">
                <Network className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground">Network Throughput</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-background/50 border border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ingress (RX)</p>
                  <p className="text-2xl font-display font-bold text-foreground">{formatBytes(stats?.network.rxPerSec)}/s</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Total: {formatBytes(stats?.network.rxBytes)}
                </div>
              </div>
              
              <div className="p-6 rounded-2xl bg-background/50 border border-border/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Egress (TX)</p>
                  <p className="text-2xl font-display font-bold text-green-400">{formatBytes(stats?.network.txPerSec)}/s</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Total: {formatBytes(stats?.network.txBytes)}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
