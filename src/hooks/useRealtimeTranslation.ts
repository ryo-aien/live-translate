import { useState, useRef, useCallback, useEffect } from "react";
import type { AppState, AppErrorCode, Direction, LanguageCode } from "../types/translation";

type Callbacks = {
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onSessionClosed: (inputText: string, outputText: string) => void;
  onError: (code: AppErrorCode) => void;
};

export function useRealtimeTranslation(callbacks: Callbacks) {
  const [state, setState] = useState<AppState>("idle");
  const [audioEnabled, setAudioEnabled] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioEnabledRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const inputTextRef = useRef("");
  const outputTextRef = useRef("");
  const cancelledRef = useRef(false);

  const toggleAudio = useCallback(() => {
    const next = !audioEnabledRef.current;
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    if (audioRef.current) {
      audioRef.current.muted = !next;
    }
  }, []);

  // Keep callbacks current without adding them to dependency arrays
  const cbRef = useRef(callbacks);
  useEffect(() => {
    cbRef.current = callbacks;
  });

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    inputTextRef.current = "";
    outputTextRef.current = "";
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    const inputText = inputTextRef.current;
    const outputText = outputTextRef.current;
    cleanup();
    if (inputText || outputText) {
      cbRef.current.onSessionClosed(inputText, outputText);
    }
    setState("idle");
  }, [cleanup]);

  const start = useCallback(
    async (direction: Direction, partnerLanguage: LanguageCode) => {
      cancelledRef.current = false;
      cleanup();
      setState("connecting");

      // Acquire microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        cbRef.current.onError("microphone_permission_denied");
        setState("error");
        return;
      }
      if (cancelledRef.current) {
        for (const t of stream.getTracks()) t.stop();
        return;
      }
      streamRef.current = stream;

      // Fetch client secret from backend
      let clientSecret: string;
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, partnerLanguage }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { clientSecret: string };
        clientSecret = data.clientSecret;
      } catch {
        cbRef.current.onError("session_create_failed");
        setState("error");
        cleanup();
        return;
      }
      if (cancelledRef.current) {
        cleanup();
        return;
      }

      // Build WebRTC connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }

      const audioEl = new Audio();
      audioEl.autoplay = true;
      audioEl.muted = !audioEnabledRef.current;
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const dc = pc.createDataChannel("oai-events");

      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as {
          type: string;
          delta?: string;
        };

        if (msg.type === "session.input_transcript.delta" && msg.delta) {
          inputTextRef.current += msg.delta;
          cbRef.current.onInputTranscript(inputTextRef.current);
          setState("recording");
        } else if (msg.type === "session.output_transcript.delta" && msg.delta) {
          outputTextRef.current += msg.delta;
          cbRef.current.onOutputTranscript(outputTextRef.current);
          setState("playing");
        } else if (msg.type === "session.closed") {
          cbRef.current.onSessionClosed(inputTextRef.current, outputTextRef.current);
          cleanup();
          setState("idle");
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          cbRef.current.onError("webrtc_connection_failed");
          setState("error");
          cleanup();
        }
      };

      // SDP offer exchange
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          "https://api.openai.com/v1/realtime/translations/calls",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp,
          }
        );
        if (!sdpRes.ok) throw new Error(`SDP error ${sdpRes.status}`);

        await pc.setRemoteDescription({
          type: "answer",
          sdp: await sdpRes.text(),
        });

        if (!cancelledRef.current) setState("ready");
      } catch {
        cbRef.current.onError("webrtc_connection_failed");
        setState("error");
        cleanup();
      }
    },
    [cleanup]
  );

  return { state, start, stop, audioEnabled, toggleAudio };
}
