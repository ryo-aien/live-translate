import { useState, useRef, useCallback, useEffect } from "react";
import type { AppErrorCode, LanguageCode } from "../types/translation";

export type AutoState = "idle" | "starting" | "listening" | "error";
export type ActiveSpeaker = "me" | "partner" | null;

type Callbacks = {
  onMeInput: (text: string) => void;
  onMeOutput: (text: string) => void;
  onPartnerInput: (text: string) => void;
  onPartnerOutput: (text: string) => void;
  onUtteranceDone: (
    speaker: "me" | "partner",
    inputText: string,
    outputText: string
  ) => void;
  onError: (code: AppErrorCode) => void;
};

// After this many ms of no delta, the active speaker resets
const SPEAKER_RESET_MS = 2800;

type Session = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
};

export function useAutoTranslation(callbacks: Callbacks) {
  const [autoState, setAutoState] = useState<AutoState>("idle");
  const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeaker>(null);

  const cbRef = useRef(callbacks);
  useEffect(() => { cbRef.current = callbacks; });

  const meSessionRef = useRef<Session | null>(null);
  const partnerSessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const meInputRef = useRef("");
  const meOutputRef = useRef("");
  const partnerInputRef = useRef("");
  const partnerOutputRef = useRef("");

  const activeSpeakerRef = useRef<ActiveSpeaker>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActive = useCallback((speaker: "me" | "partner") => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    if (activeSpeakerRef.current !== speaker) {
      // flush previous speaker's utterance to history
      if (activeSpeakerRef.current === "me" && (meInputRef.current || meOutputRef.current)) {
        cbRef.current.onUtteranceDone("me", meInputRef.current, meOutputRef.current);
        meInputRef.current = "";
        meOutputRef.current = "";
        cbRef.current.onMeInput("");
        cbRef.current.onMeOutput("");
      } else if (activeSpeakerRef.current === "partner" && (partnerInputRef.current || partnerOutputRef.current)) {
        cbRef.current.onUtteranceDone("partner", partnerInputRef.current, partnerOutputRef.current);
        partnerInputRef.current = "";
        partnerOutputRef.current = "";
        cbRef.current.onPartnerInput("");
        cbRef.current.onPartnerOutput("");
      }
      activeSpeakerRef.current = speaker;
      setActiveSpeaker(speaker);
    }

    // mute/unmute audio based on active speaker
    if (meSessionRef.current) {
      meSessionRef.current.audio.muted = speaker !== "me";
    }
    if (partnerSessionRef.current) {
      partnerSessionRef.current.audio.muted = speaker !== "partner";
    }

    resetTimerRef.current = setTimeout(() => {
      // silence — flush current utterance and reset
      if (activeSpeakerRef.current === "me" && (meInputRef.current || meOutputRef.current)) {
        cbRef.current.onUtteranceDone("me", meInputRef.current, meOutputRef.current);
        meInputRef.current = "";
        meOutputRef.current = "";
        cbRef.current.onMeInput("");
        cbRef.current.onMeOutput("");
      } else if (activeSpeakerRef.current === "partner" && (partnerInputRef.current || partnerOutputRef.current)) {
        cbRef.current.onUtteranceDone("partner", partnerInputRef.current, partnerOutputRef.current);
        partnerInputRef.current = "";
        partnerOutputRef.current = "";
        cbRef.current.onPartnerInput("");
        cbRef.current.onPartnerOutput("");
      }
      activeSpeakerRef.current = null;
      setActiveSpeaker(null);
      if (meSessionRef.current) meSessionRef.current.audio.muted = false;
      if (partnerSessionRef.current) partnerSessionRef.current.audio.muted = false;
    }, SPEAKER_RESET_MS);
  }, []);

  const cleanup = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    meSessionRef.current?.pc.close();
    meSessionRef.current = null;
    partnerSessionRef.current?.pc.close();
    partnerSessionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    meInputRef.current = "";
    meOutputRef.current = "";
    partnerInputRef.current = "";
    partnerOutputRef.current = "";
    activeSpeakerRef.current = null;
  }, []);

  const createSession = useCallback(
    async (
      clientSecret: string,
      stream: MediaStream,
      speaker: "me" | "partner"
    ): Promise<Session> => {
      const pc = new RTCPeerConnection();
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      const audio = new Audio();
      audio.autoplay = true;
      audio.muted = true; // start muted; unmuted when active
      pc.ontrack = (e) => { audio.srcObject = e.streams[0]; };

      const dc = pc.createDataChannel("oai-events");
      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as {
          type: string;
          delta?: string;
        };
        if (msg.type === "session.input_transcript.delta" && msg.delta) {
          // only accept if this speaker is active or no speaker is active yet
          if (activeSpeakerRef.current === null || activeSpeakerRef.current === speaker) {
            setActive(speaker);
            if (speaker === "me") {
              meInputRef.current += msg.delta;
              cbRef.current.onMeInput(meInputRef.current);
            } else {
              partnerInputRef.current += msg.delta;
              cbRef.current.onPartnerInput(partnerInputRef.current);
            }
          }
        } else if (msg.type === "session.output_transcript.delta" && msg.delta) {
          if (activeSpeakerRef.current === null || activeSpeakerRef.current === speaker) {
            setActive(speaker);
            if (speaker === "me") {
              meOutputRef.current += msg.delta;
              cbRef.current.onMeOutput(meOutputRef.current);
            } else {
              partnerOutputRef.current += msg.delta;
              cbRef.current.onPartnerOutput(partnerOutputRef.current);
            }
          }
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          cbRef.current.onError("webrtc_connection_failed");
        }
      };

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
      if (!sdpRes.ok) throw new Error(`SDP ${sdpRes.status}`);
      await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });

      return { pc, audio };
    },
    [setActive]
  );

  const start = useCallback(
    async (partnerLanguage: LanguageCode) => {
      cleanup();
      setAutoState("starting");
      activeSpeakerRef.current = null;
      setActiveSpeaker(null);

      // microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        cbRef.current.onError("microphone_permission_denied");
        setAutoState("error");
        return;
      }
      streamRef.current = stream;

      // fetch both client secrets in parallel
      let secretMe: string;
      let secretPartner: string;
      try {
        const [resMe, resPartner] = await Promise.all([
          fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: "me_to_partner", partnerLanguage }),
          }),
          fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ direction: "partner_to_me", partnerLanguage }),
          }),
        ]);
        if (!resMe.ok || !resPartner.ok) throw new Error("session failed");
        const [dMe, dPartner] = await Promise.all([
          resMe.json() as Promise<{ clientSecret: string }>,
          resPartner.json() as Promise<{ clientSecret: string }>,
        ]);
        secretMe = dMe.clientSecret;
        secretPartner = dPartner.clientSecret;
      } catch {
        cbRef.current.onError("session_create_failed");
        setAutoState("error");
        cleanup();
        return;
      }

      // establish both WebRTC connections in parallel
      try {
        const [sessMe, sessPartner] = await Promise.all([
          createSession(secretMe, stream, "me"),
          createSession(secretPartner, stream, "partner"),
        ]);
        meSessionRef.current = sessMe;
        partnerSessionRef.current = sessPartner;
        setAutoState("listening");
      } catch {
        cbRef.current.onError("webrtc_connection_failed");
        setAutoState("error");
        cleanup();
      }
    },
    [cleanup, createSession]
  );

  const stop = useCallback(() => {
    // flush any in-progress utterance
    if (activeSpeakerRef.current === "me" && (meInputRef.current || meOutputRef.current)) {
      cbRef.current.onUtteranceDone("me", meInputRef.current, meOutputRef.current);
    } else if (activeSpeakerRef.current === "partner" && (partnerInputRef.current || partnerOutputRef.current)) {
      cbRef.current.onUtteranceDone("partner", partnerInputRef.current, partnerOutputRef.current);
    }
    cleanup();
    setAutoState("idle");
    setActiveSpeaker(null);
  }, [cleanup]);

  return { autoState, activeSpeaker, start, stop };
}
