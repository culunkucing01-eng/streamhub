import { useState } from "react";
import { useListChannels, useCreateChannel, useUpdateChannel, useDeleteChannel, useRegenerateStreamKey } from "@workspace/api-client-react";
import type { Channel } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, Copy, Trash2, KeyRound, ExternalLink, Loader2, RefreshCw, Tv } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function Channels() {
  const queryClient = useQueryClient();
  const { data: channels, isLoading } = useListChannels();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  
  const createMutation = useCreateChannel({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/channels'] }); setIsCreateOpen(false); } } });
  const updateMutation = useUpdateChannel({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['/api/channels'] }); setEditChannel(null); } } });
  const deleteMutation = useDeleteChannel({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/channels'] }) } });
  const regenMutation = useRegenerateStreamKey({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/channels'] }) } });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({ data: { name: fd.get("name") as string, description: fd.get("description") as string } });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editChannel) return;
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({ 
      id: editChannel.id, 
      data: { 
        name: fd.get("name") as string, 
        description: fd.get("description") as string,
        isActive: fd.get("isActive") === "on"
      } 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, show a toast here
  };

  const ChannelModal = ({ channel, onClose }: { channel?: Channel | null, onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-border/50">
          <h2 className="text-xl font-bold font-display">{channel ? 'Edit Channel' : 'Create New Channel'}</h2>
        </div>
        <form onSubmit={channel ? handleUpdate : handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Channel Name</label>
            <input name="name" defaultValue={channel?.name || ''} required className="w-full px-4 py-2 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" defaultValue={channel?.description || ''} className="w-full px-4 py-2 rounded-xl bg-secondary/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[100px]" />
          </div>
          {channel && (
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isActive" id="isActive" defaultChecked={channel.isActive} className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-secondary/50" />
              <label htmlFor="isActive" className="text-sm font-medium">Channel Active</label>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {channel ? 'Save Changes' : 'Create Channel'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Channels</h1>
            <p className="text-muted-foreground mt-1">Manage broadcasting channels and stream keys.</p>
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
            <Plus className="w-5 h-5" />
            New Channel
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {channels?.map((channel, i) => (
              <motion.div 
                key={channel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl overflow-hidden border border-border/50 group"
              >
                <div className="p-6 border-b border-border/50 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-display font-bold text-xl">{channel.name}</h3>
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider", channel.isActive ? "bg-green-500/20 text-green-500 border border-green-500/30" : "bg-muted text-muted-foreground")}>
                        {channel.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{channel.description || 'No description provided'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditChannel(channel)} className="p-2 rounded-lg bg-secondary/50 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"><Settings className="w-4 h-4" /></button>
                    <button 
                      onClick={() => { if(confirm('Are you sure you want to delete this channel?')) deleteMutation.mutate({ id: channel.id }) }} 
                      className="p-2 rounded-lg bg-secondary/50 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-background/30 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Stream Key</label>
                      <button onClick={() => regenMutation.mutate({ id: channel.id })} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <RefreshCw className={cn("w-3 h-3", regenMutation.isPending && "animate-spin")} /> Regenerate
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="password" readOnly value={channel.streamKey} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-muted-foreground focus:outline-none" />
                      <button onClick={() => copyToClipboard(channel.streamKey)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">RTMP Ingest URL</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={channel.rtmpUrl} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-muted-foreground focus:outline-none" />
                      <button onClick={() => copyToClipboard(channel.rtmpUrl)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">HLS Playback URL</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={channel.hlsUrl} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-muted-foreground focus:outline-none" />
                      <button onClick={() => copyToClipboard(channel.hlsUrl)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">WebRTC Playback URL</label>
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly value={channel.webrtcUrl} className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-muted-foreground focus:outline-none" />
                      <button onClick={() => copyToClipboard(channel.webrtcUrl)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"><Copy className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Created {format(new Date(channel.createdAt), 'MMM d, yyyy')}</span>
                    <a href={`/player/${channel.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary flex items-center gap-1.5 hover:underline">
                      Public Player <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
            {channels?.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-border/50 rounded-2xl bg-card/20">
                <Tv className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No channels yet</h3>
                <p className="text-muted-foreground mb-4">Create your first broadcasting channel to get started.</p>
                <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Create Channel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreateOpen && <ChannelModal onClose={() => setIsCreateOpen(false)} />}
        {editChannel && <ChannelModal channel={editChannel} onClose={() => setEditChannel(null)} />}
      </AnimatePresence>
    </Layout>
  );
}
