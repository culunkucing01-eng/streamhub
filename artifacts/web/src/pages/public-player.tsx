import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StreamPlayer } from "@/components/stream-player";
import { Tv, AlertCircle, PauseCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PublicChannel {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isSuspended: boolean;
  hlsUrl: string;
  mp4Url: string;
  webrtcUrl?: string;
  createdAt: string;
}

export default function PublicPlayer() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: channel, isLoading, isError } = useQuery<PublicChannel>({
    queryKey: ["public-channel", id],
    queryFn: async () => {
      const res = await fetch(`/api/channels/public/${id}`);
      if (!res.ok) throw new Error("Channel not found");
      return res.json();
    },
    retry: false,
    enabled: id > 0,
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Channel Not Found</h1>
        <p className="text-gray-400 text-center max-w-md">
          The broadcasting channel you are looking for does not exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-accent/10 pointer-events-none" />

      <header className="p-6 md:p-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">StreamHub</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
        >
          {channel.isSuspended ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-6 gap-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <PauseCircle className="w-10 h-10 text-amber-400" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Broadcast Temporarily On Hold</h2>
                <p className="text-gray-400 text-sm max-w-sm">
                  This channel's public broadcast has been temporarily suspended. Please check back later.
                </p>
              </div>
            </div>
          ) : channel.isActive ? (
            <StreamPlayer
              webrtcUrl={channel.webrtcUrl}
              hlsUrl={channel.hlsUrl}
              mp4Url={channel.mp4Url}
              showModeLabel
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-6">
              <Tv className="w-16 h-16 text-white/20 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Stream Offline</h2>
              <p className="text-gray-400">This channel is currently not broadcasting.</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{channel.name}</h1>
            <p className="text-gray-400 mt-1">{channel.description}</p>
          </div>

          {channel.isSuspended ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full self-start">
              <PauseCircle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm uppercase tracking-wider">On Hold</span>
            </div>
          ) : channel.isActive ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full self-start">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-semibold text-sm uppercase tracking-wider">Live Broadcast</span>
            </div>
          ) : null}
        </motion.div>
      </main>
    </div>
  );
}
