"use client";

import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

const socket = io();

export default function MusicDisplay() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    socket.on('connect', () => { console.log('music display socket connected'); socket.emit('join', 'displays'); });
    socket.on('music:update', (payload: unknown) => {
      const p = payload as { action?: string; value?: unknown } | undefined;
      const { action, value } = p || {};
      if (!audioRef.current) return;
      if (action === 'play') {
        audioRef.current.play();
      } else if (action === 'pause') {
        audioRef.current.pause();
      } else if (action === 'volume') {
        audioRef.current.volume = Number(value ?? 1);
      } else if (action === 'playlist') {
        // In this simple example we'll map playlist keys to sample URLs
        const map: Record<string, string> = {
          default: '/samples/default.mp3',
          rock: '/samples/rock.mp3',
          pop: '/samples/pop.mp3'
        };
        const url = map[String(value)] ?? map.default;
        setSrc(url);
      }
    });

    return () => { socket.off('music:update'); };
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black">
      <audio ref={audioRef} src={src ?? undefined} loop />
      <div className="text-white text-center">
        <div className="text-2xl">Music Display</div>
        <div className="text-sm mt-2">Source: {src ?? 'none'}</div>
      </div>
    </div>
  );
}
