import { useState, useRef, useCallback, useEffect } from "react";
import type { AppErrorCode, LanguageCode } from "../types/translation";

export type DualState = "idle" | "connecting" | "ready";

type Callbacks = {
  onMeInput:       (text: string) => void;
  onMeOutput:      (text: string) => void;
  onPartnerInput:  (text: string) => void;
  onPartnerOutput: (text: string) => void;
  onUtteranceDone: (speaker: "me" | "partner", inputText: string, outputText: string) => void;
  onError: (code: AppErrorCode) => void;
};

type Session = { pc: RTCPeerConnection; audio: HTMLAudioElement };

export function useDualTranslation(callbacks: Callbacks) {
  const [state, setState]           = useState<DualState>("idle");
  const [activeSpeaker, setActiveSpeaker] = useState<"me" | "partner">("me");
  const [audioEnabled, setAudioEnabled]   = useState(false);
  const [stream, setStream]               = useState<MediaStream | null>(null);

  const cbRef            = useRef(callbacks);
  const activeSpeakerRef = useRef<"me" | "partner">("me");
  const audioEnabledRef  = useRef(false);

  useEffect(() => { cbRef.current = callbacks; });

  const meSessionRef      = useRef<Session | null>(null);
  const partnerSessionRef = useRef<Session | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);

  const meInputRef      = useRef("");
  const meOutputRef     = useRef("");
  const partnerInputRef = useRef("");
  const partnerOutRef   = useRef("");

  const toggleAudio = useCallback(() => {
    const next = !audioEnabledRef.current;
    audioEnabledRef.current = next;
    setAudioEnabled(next);
    // apply to whichever session is currently unmuted (the active one)
    const active = activeSpeakerRef.current;
    const sess = active === "me" ? meSessionRef.current : partnerSessionRef.current;
    if (sess) sess.audio.muted = !next;
  }, []);

  const flushSpeaker = useCallback((speaker: "me" | "partner") => {
    if (speaker === "me" && (meInputRef.current || meOutputRef.current)) {
      cbRef.current.onUtteranceDone("me", meInputRef.current, meOutputRef.current);
      meInputRef.current = ""; meOutputRef.current = "";
      cbRef.current.onMeInput(""); cbRef.current.onMeOutput("");
    } else if (speaker === "partner" && (partnerInputRef.current || partnerOutRef.current)) {
      cbRef.current.onUtteranceDone("partner", partnerInputRef.current, partnerOutRef.current);
      partnerInputRef.current = ""; partnerOutRef.current = "";
      cbRef.current.onPartnerInput(""); cbRef.current.onPartnerOutput("");
    }
  }, []);

  // manually switch active speaker — no reconnect needed
  const setSpeaker = useCallback((speaker: "me" | "partner") => {
    if (activeSpeakerRef.current === speaker) return;
    flushSpeaker(activeSpeakerRef.current);
    activeSpeakerRef.current = speaker;
    setActiveSpeaker(speaker);
    // mute / unmute
    if (meSessionRef.current)      meSessionRef.current.audio.muted      = speaker !== "me"      || !audioEnabledRef.current;
    if (partnerSessionRef.current) partnerSessionRef.current.audio.muted = speaker !== "partner" || !audioEnabledRef.current;
  }, [flushSpeaker]);

  const cleanup = useCallback(() => {
    meSessionRef.current?.pc.close();      meSessionRef.current      = null;
    partnerSessionRef.current?.pc.close(); partnerSessionRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    setStream(null);
    meInputRef.current = ""; meOutputRef.current = "";
    partnerInputRef.current = ""; partnerOutRef.current = "";
  }, []);

  const createSession = useCallback(
    async (clientSecret: string, stream: MediaStream, speaker: "me" | "partner"): Promise<Session> => {
      const pc = new RTCPeerConnection();
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      const audio = new Audio();
      audio.autoplay = true;
      // start muted; unmuted only for active speaker when audioEnabled
      audio.muted = activeSpeakerRef.current !== speaker || !audioEnabledRef.current;
      pc.ontrack = e => { audio.srcObject = e.streams[0]; };

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = e => {
        const msg = JSON.parse(e.data as string) as { type: string; delta?: string };
        if (activeSpeakerRef.current !== speaker) return; // ignore inactive session

        if (msg.type === "session.input_transcript.delta" && msg.delta) {
          if (speaker === "me") {
            meInputRef.current += msg.delta;
            cbRef.current.onMeInput(meInputRef.current);
          } else {
            partnerInputRef.current += msg.delta;
            cbRef.current.onPartnerInput(partnerInputRef.current);
          }
        } else if (msg.type === "session.output_transcript.delta" && msg.delta) {
          if (speaker === "me") {
            meOutputRef.current += msg.delta;
            cbRef.current.onMeOutput(meOutputRef.current);
          } else {
            partnerOutRef.current += msg.delta;
            cbRef.current.onPartnerOutput(partnerOutRef.current);
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") cbRef.current.onError("webrtc_connection_failed");
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch("https://api.openai.com/v1/realtime/translations/calls", {
        method: "POST",
        headers: { Authorization: `Bearer ${clientSecret}`, "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!sdpRes.ok) throw new Error(`SDP ${sdpRes.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
      return { pc, audio };
    },
    []
  );

  const start = useCallback(
    async (partnerLanguage: LanguageCode, initialSpeaker: "me" | "partner" = "me") => {
      cleanup();
      setState("connecting");
      activeSpeakerRef.current = initialSpeaker;
      setActiveSpeaker(initialSpeaker);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        cbRef.current.onError("microphone_permission_denied");
        setState("idle");
        return;
      }
      streamRef.current = stream;
      setStream(stream);

      let secretMe: string, secretPartner: string;
      try {
        const [rMe, rPt] = await Promise.all([
          fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: "me_to_partner", partnerLanguage }) }),
          fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: "partner_to_me", partnerLanguage }) }),
        ]);
        if (!rMe.ok || !rPt.ok) throw new Error("session failed");
        const [dMe, dPt] = await Promise.all([
          rMe.json() as Promise<{ clientSecret: string }>,
          rPt.json() as Promise<{ clientSecret: string }>,
        ]);
        secretMe = dMe.clientSecret;
        secretPartner = dPt.clientSecret;
      } catch {
        cbRef.current.onError("session_create_failed");
        setState("idle");
        cleanup();
        return;
      }

      try {
        const [sessMe, sessPt] = await Promise.all([
          createSession(secretMe, stream, "me"),
          createSession(secretPartner, stream, "partner"),
        ]);
        meSessionRef.current      = sessMe;
        partnerSessionRef.current = sessPt;
        setState("ready");
      } catch {
        cbRef.current.onError("webrtc_connection_failed");
        setState("idle");
        cleanup();
      }
    },
    [cleanup, createSession]
  );

  const stop = useCallback(() => {
    flushSpeaker(activeSpeakerRef.current);
    cleanup();
    setState("idle");
  }, [cleanup, flushSpeaker]);

  return { state, activeSpeaker, audioEnabled, toggleAudio, start, stop, setSpeaker, stream };
}
