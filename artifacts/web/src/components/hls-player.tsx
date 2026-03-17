import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { Play, Volume2, VolumeX, Maximize } from "lucide-react";

interface HlsPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  url: string;
  mp4Url?: string;
  autoplay?: boolean;
}

export function HlsPlayer({ url, mp4Url, autoplay = true, className, ...props }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isMuted, setIsMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | undefined;

    const tryMp4Fallback = () => {
      if (mp4Url && video) {
        video.src = mp4Url;
        video.addEventListener("loadedmetadata", () => {
          if (autoplay) {
            video.play().catch((e) => {
              console.warn("Autoplay prevented:", e);
              setIsPlaying(false);
            });
          }
        });
      } else {
        setError("Stream unavailable or format not supported");
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        enableWorker: true,
      });
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoplay) {
          video.play().catch((e) => {
            console.warn("Autoplay prevented:", e);
            setIsPlaying(false);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls?.recoverMediaError();
              break;
            default:
              hls?.destroy();
              tryMp4Fallback();
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (autoplay) {
          video.play().catch((e) => {
            console.warn("Autoplay prevented:", e);
            setIsPlaying(false);
          });
        }
      });
      video.addEventListener("error", () => {
        tryMp4Fallback();
      });
    } else {
      tryMp4Fallback();
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, mp4Url, autoplay]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative group overflow-hidden bg-black rounded-xl border border-border/50", className)}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 text-muted-foreground p-6 text-center">
          <p>{error}</p>
        </div>
      ) : null}
      
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain"
        {...props}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <div className="flex items-center gap-4 text-white">
          <button 
            onClick={togglePlay}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            {isPlaying ? <div className="w-5 h-5 border-l-4 border-r-4 border-white" /> : <Play className="w-5 h-5 fill-white" />}
          </button>
          
          <button 
            onClick={toggleMute}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold bg-red-500/20 text-red-500 px-2 py-1 rounded-md border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="p-2 hover:bg-white/20 rounded-full transition-colors ml-2"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
