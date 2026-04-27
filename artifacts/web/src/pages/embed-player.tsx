import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { StreamPlayer } from "@/components/stream-player";
import { PauseCircle } from "lucide-react";

interface PublicChannel {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isSuspended: boolean;
  hlsUrl: string;
  mp4Url: string;
  webrtcUrl?: string;
}

export default function EmbedPlayer() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: channel, isLoading, isError } = useQuery<PublicChannel>({
    queryKey: ["embed-channel", id],
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
      <div className="w-full h-full min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="w-full h-full min-h-screen bg-black flex items-center justify-center text-white text-sm">
        Channel not found
      </div>
    );
  }

  if (channel.isSuspended) {
    return (
      <div className="w-full h-full min-h-screen bg-zinc-900 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <PauseCircle className="w-8 h-8 text-amber-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-base">Broadcast Temporarily On Hold</p>
          <p className="text-white/40 text-sm mt-1">Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!channel.isActive) {
    return (
      <div className="w-full h-full min-h-screen bg-black flex flex-col items-center justify-center text-white gap-3">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
          <svg className="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-white/40 text-sm">Stream Offline</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-black flex flex-col relative overflow-hidden">
      <div className="absolute inset-0">
        <StreamPlayer
          webrtcUrl={channel.webrtcUrl}
          hlsUrl={channel.hlsUrl}
          mp4Url={channel.mp4Url}
          showModeLabel={false}
          autoplay
          className="w-full h-full rounded-none border-0"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 rounded text-white text-xs font-bold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            Live
          </div>
          <span className="text-white text-sm font-medium drop-shadow">{channel.name}</span>
        </div>
      </div>
    </div>
  );
}
