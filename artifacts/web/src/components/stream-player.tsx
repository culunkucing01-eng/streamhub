import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";
import { Play, Volume2, VolumeX, Maximize, Wifi, Radio } from "lucide-react";

type Mode = "webrtc" | "hls" | "idle" | "error";

interface StreamPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  webrtcUrl?: string;
  hlsUrl?: string;
  mp4Url?: string;
  autoplay?: boolean;
  showModeLabel?: boolean;
}

async function startWhep(
  videoEl: HTMLVideoElement,
  whepUrl: string,
  signal: AbortSignal
): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  });

  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      videoEl.srcObject = event.streams[0];
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    if (pc.iceGatheringState === "complete") return resolve();
    const timeout = setTimeout(() => resolve(), 4000);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
      }
    };
  });

  if (signal.aborted) {
    pc.close();
    throw new DOMException("Aborted", "AbortError");
  }

  const sdpOffer = pc.localDescription?.sdp;
  if (!sdpOffer) throw new Error("No SDP offer generated");

  const res = await fetch(whepUrl, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: sdpOffer,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WHEP ${res.status}: ${text}`);
  }

  const sdpAnswer = await res.text();
  await pc.setRemoteDescription({ type: "answer", sdp: sdpAnswer });

  return pc;
}

export function StreamPlayer({
  webrtcUrl,
  hlsUrl,
  mp4Url,
  autoplay = true,
  showModeLabel = true,
  className,
  ...props
}: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [showUnmuteHint, setShowUnmuteHint] = useState(false);

  const cleanup = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = "";
      videoRef.current.load();
    }
  }, []);

  const handleVideoPlaying = useCallback(() => {
    setIsPlaying(true);
    setShowUnmuteHint(true);
  }, []);

  const unmute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    setIsMuted(false);
    setShowUnmuteHint(false);
  }, []);

  const startHls = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;

    setMode("hls");

    const tryPlay = () => {
      if (autoplay) {
        video.play().catch(() => setIsPlaying(false));
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            hls.destroy();
            if (mp4Url) {
              video.src = mp4Url;
              video.addEventListener("loadedmetadata", tryPlay, { once: true });
            } else {
              setMode("error");
            }
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    } else if (mp4Url) {
      video.src = mp4Url;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    } else {
      setMode("error");
    }
  }, [autoplay, mp4Url]);

  const startWebRtc = useCallback(async (url: string) => {
    const video = videoRef.current;
    if (!video) return;

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const pc = await startWhep(video, url, ac.signal);
      if (ac.signal.aborted) { pc.close(); return; }
      pcRef.current = pc;
      setMode("webrtc");

      video.onloadedmetadata = () => {
        if (autoplay) video.play().catch(() => setIsPlaying(false));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          cleanup();
          if (hlsUrl) {
            setTimeout(() => startHls(hlsUrl), 500);
          } else {
            setMode("error");
          }
        }
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      console.warn("WebRTC failed, falling back to HLS:", err);
      if (hlsUrl) {
        startHls(hlsUrl);
      } else {
        setMode("error");
      }
    }
  }, [autoplay, cleanup, hlsUrl, startHls]);

  useEffect(() => {
    cleanup();
    setShowUnmuteHint(false);
    setIsMuted(true);

    if (webrtcUrl) {
      startWebRtc(webrtcUrl);
    } else if (hlsUrl) {
      startHls(hlsUrl);
    } else {
      setMode("idle");
    }

    return cleanup;
  }, [webrtcUrl, hlsUrl, cleanup, startWebRtc, startHls]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); }
    else { videoRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted) setShowUnmuteHint(false);
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
      {...props}
    >
      {mode === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 text-muted-foreground p-6 text-center z-10">
          <p>Stream tidak tersedia atau format tidak didukung browser ini.</p>
        </div>
      )}

      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        className="w-full h-full object-contain"
        onPlaying={handleVideoPlaying}
      />

      {showUnmuteHint && isMuted && (
        <button
          onClick={unmute}
          className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-transparent group/unmute cursor-pointer"
          aria-label="Aktifkan suara"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 shadow-xl transition-transform group-hover/unmute:scale-105">
            <div className="relative">
              <VolumeX className="w-10 h-10 text-white" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <span className="text-white font-semibold text-sm text-center leading-tight">
              Klik untuk aktifkan suara
            </span>
          </div>
        </button>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
        <div className="flex items-center gap-4 text-white">
          <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            {isPlaying
              ? <div className="w-5 h-5 border-l-4 border-r-4 border-white" />
              : <Play className="w-5 h-5 fill-white" />}
          </button>

          <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-5 h-5 text-yellow-400" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {showModeLabel && mode !== "idle" && (
              <span className="flex items-center gap-1.5 text-xs font-medium bg-white/10 px-2 py-1 rounded-md text-white/70">
                {mode === "webrtc"
                  ? <><Wifi className="w-3 h-3" />WebRTC</>
                  : mode === "hls"
                  ? <><Radio className="w-3 h-3" />HLS</>
                  : null}
              </span>
            )}
            <span className="flex items-center gap-2 text-xs font-semibold bg-red-500/20 text-red-500 px-2 py-1 rounded-md border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          </div>

          <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full transition-colors ml-2">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
