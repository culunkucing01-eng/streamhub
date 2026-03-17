import { useGetStreamStats } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Tv, Users, Activity, BarChart3, Wifi, DollarSign, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import type { LucideIcon } from "lucide-react";

function StatCard({ title, value, icon: Icon, color, delay }: { title: string, value: string | number, icon: LucideIcon, color: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-2xl p-6 relative overflow-hidden group"
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} style={{ backgroundColor: color }} />
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-3 rounded-xl bg-secondary/50 border border-border/50">
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-display font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStreamStats();

  if (isLoading) {
    return (
      <Layout>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  // Format bandwidth nicely
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const chartData = stats?.recentViewerCounts?.map(d => ({
    time: new Date(d.timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    viewers: d.count
  })) || [];

  return (
    <Layout>
      <div className="space-y-8 pb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time statistics across all broadcasting channels.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <StatCard title="Active Streams" value={stats?.activeStreams || 0} icon={Activity} color="#00E5FF" delay={0.1} />
          <StatCard title="Total Viewers" value={stats?.totalViewers || 0} icon={Users} color="#B388FF" delay={0.2} />
          <StatCard title="Total Channels" value={stats?.totalChannels || 0} icon={Tv} color="#00E5FF" delay={0.3} />
          <StatCard title="Network Egress" value={formatBytes(stats?.totalBandwidth || 0)} icon={Wifi} color="#4ade80" delay={0.4} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Viewer Analytics (24h)
              </h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Area type="monotone" dataKey="viewers" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorViewers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass rounded-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent" />
                Billing Summary
              </h2>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border border-border/50 rounded-xl bg-secondary/20">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <DollarSign className="w-8 h-8 text-accent" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Recurring Revenue</p>
              <h3 className="text-4xl font-display font-bold text-foreground">${stats?.totalRevenue || 0}</h3>
            </div>
            
            <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Active Subscriptions</span>
              </div>
              <span className="font-bold">{stats?.totalUsers || 0}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
