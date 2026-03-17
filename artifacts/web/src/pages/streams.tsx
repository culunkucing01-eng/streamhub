import { useGetActiveStreams } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { HlsPlayer } from "@/components/hls-player";
import { motion } from "framer-motion";
import { Radio, Users, Activity, Clock, Loader2, AlertCircle } from "lucide-react";

export default function Streams() {
  // Use polling for live updates (e.g. every 10s)
  const { data: streams, isLoading } = useGetActiveStreams({
    query: {
      queryKey: ["/api/streams/active"],
      refetchInterval: 10000 
    }
  });

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const formatBitrate = (kbps: number) => {
    return `${(kbps / 1000).toFixed(1)} Mbps`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Radio className="w-8 h-8 text-red-500 animate-pulse" />
            Live Streams
          </h1>
          <p className="text-muted-foreground mt-1">Monitor currently active broadcasts traversing the media server.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {streams?.map((stream, i) => (
              <motion.div 
                key={stream.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl overflow-hidden flex flex-col"
              >
                {/* Embedded Preview Player */}
                <div className="aspect-video relative bg-black border-b border-border/50">
                  {/* Construct HLS URL based on SRS standard pattern - using the stream name (which usually is the streamKey) */}
                  <HlsPlayer 
                    url={`/live/${stream.stream}.m3u8`} 
                    autoplay={true} 
                    muted={true}
                    className="w-full h-full"
                  />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wide">Live</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-lg mb-4 truncate" title={stream.channelName || stream.name}>
                    {stream.channelName || stream.name}
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto">
                    <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Viewers</span>
                      </div>
                      <span className="text-lg font-bold">{stream.viewers || 0}</span>
                    </div>
                    
                    <div className="bg-secondary/40 rounded-xl p-3 border border-border/30">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Bitrate</span>
                      </div>
                      <span className="text-lg font-bold">{formatBitrate(stream.bitrate || 0)}</span>
                    </div>

                    <div className="bg-secondary/40 rounded-xl p-3 border border-border/30 col-span-2">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase">Uptime</span>
                      </div>
                      <span className="text-lg font-bold">{formatUptime(stream.uptime || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
                    <span>Codec: {stream.videoCodec} / {stream.audioCodec}</span>
                    <span>Res: {stream.width}x{stream.height}</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {streams?.length === 0 && (
              <div className="col-span-full py-20 text-center border border-dashed border-border/50 rounded-2xl bg-card/20">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-1 text-foreground">No Active Streams</h3>
                <p className="text-muted-foreground">There are currently no live broadcasts traversing the server.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
