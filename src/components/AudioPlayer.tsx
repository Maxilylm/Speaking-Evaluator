"use client";

import { useEffect, useRef, useCallback } from "react";

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (time: number) => void;
  seekTo?: number | null;
}

export default function AudioPlayer({
  audioUrl,
  onTimeUpdate,
  seekTo,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      const hue = (i / bufferLength) * 60 + 200;
      ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onTimeUpdate?.(audio.currentTime);
    };

    const handlePlay = () => {
      if (!audioContextRef.current) {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      }
      draw();
    };

    const handlePause = () => {
      cancelAnimationFrame(animationRef.current);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      cancelAnimationFrame(animationRef.current);
    };
  }, [onTimeUpdate, draw]);

  useEffect(() => {
    if (seekTo != null && audioRef.current) {
      audioRef.current.currentTime = seekTo;
      audioRef.current.play();
    }
  }, [seekTo]);

  return (
    <div className="bg-white rounded-lg border p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={80}
        className="w-full h-20 rounded mb-3"
      />
      <audio ref={audioRef} src={audioUrl} controls className="w-full" />
    </div>
  );
}
