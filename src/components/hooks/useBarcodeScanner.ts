"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DETECT_INTERVAL_MS,
  SCAN_COOLDOWN_MS,
} from "@/constants/barcode";
import {
  createBarcodeDetector,
  setTrackTorch,
  sizeDecodeCanvas,
  streamSupportsTorch,
  withSilencedConsoleWarn,
} from "@/lib/barcode";

export function useBarcodeScanner({
  enabled,
  paused,
  torch,
  onDetect,
  onPermission,
}: {
  enabled: boolean;
  paused: boolean;
  torch: boolean;
  onDetect: (code: string) => void;
  onPermission: (granted: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectRef = useRef(onDetect);
  const onPermissionRef = useRef(onPermission);
  const pausedRef = useRef(paused);
  const lastCodeRef = useRef("");
  const lastAtRef = useRef(0);
  const [live, setLive] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useLayoutEffect(() => {
    onDetectRef.current = onDetect;
    onPermissionRef.current = onPermission;
    pausedRef.current = paused;
  }, [onDetect, onPermission, paused]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let stopScan: (() => void) | null = null;
    let stream: MediaStream | null = null;
    const video = videoRef.current;

    const emit = (raw: string) => {
      if (pausedRef.current) return;
      const code = raw.trim();
      if (!code) return;
      const now = Date.now();
      if (code === lastCodeRef.current && now - lastAtRef.current < SCAN_COOLDOWN_MS) {
        return;
      }
      lastCodeRef.current = code;
      lastAtRef.current = now;
      onDetectRef.current(code);
    };

    const startNativeLoop = async (el: HTMLVideoElement) => {
      const detector = await createBarcodeDetector();
      if (!detector || cancelled) return false;
      const id = window.setInterval(() => {
        if (pausedRef.current) return;
        if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        void detector
          .detect(el)
          .then((codes) => {
            const value = codes[0]?.rawValue;
            if (value) emit(value);
          })
          .catch(() => {
            /* drop frame */
          });
      }, DETECT_INTERVAL_MS);
      stopScan = () => window.clearInterval(id);
      return true;
    };

    const startZxingLoop = async (el: HTMLVideoElement) => {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      if (cancelled) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.ASSUME_GS1, true);
      const reader = new BrowserMultiFormatReader(hints);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D unavailable");

      let busy = false;
      const id = window.setInterval(() => {
        if (cancelled || pausedRef.current || busy) return;
        if (el.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (!sizeDecodeCanvas(canvas, el)) return;

        busy = true;
        try {
          ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
          const result = withSilencedConsoleWarn(() =>
            reader.decodeFromCanvas(canvas),
          );
          if (result) emit(result.getText());
        } catch {
          /* no code this frame */
        } finally {
          busy = false;
        }
      }, DETECT_INTERVAL_MS);

      stopScan = () => window.clearInterval(id);
    };

    const run = async () => {
      if (!video || !navigator.mediaDevices?.getUserMedia) {
        onPermissionRef.current(false);
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        await video.play();
        if (cancelled) return;

        setTorchSupported(streamSupportsTorch(stream));
        setLive(true);
        onPermissionRef.current(true);

        try {
          await startZxingLoop(video);
        } catch {
          if (!cancelled) await startNativeLoop(video);
        }
      } catch {
        if (!cancelled) {
          streamRef.current = null;
          setLive(false);
          setTorchSupported(false);
          onPermissionRef.current(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      stopScan?.();
      const current = streamRef.current ?? stream;
      streamRef.current = null;
      current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      setLive(false);
      setTorchSupported(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!live) return;
    void setTrackTorch(streamRef.current, torch);
  }, [torch, live]);

  return { videoRef, live, torchSupported };
}
