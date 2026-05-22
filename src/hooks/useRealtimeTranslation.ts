import { useState, useRef, useCallback } from "react";
import type {
  AppState,
  AppErrorCode,
  Direction,
  LanguageCode,
  ConversationItem,
} from "../types/translation";

type TranscriptState = {
  sourceText: string;
  translatedText: string;
};

type UseRealtimeTranslationOptions = {
  onConversationItem: (item: ConversationItem) => void;
};

export function useRealtimeTranslation({
  onConversationItem,
}: UseRealtimeTranslationOptions) {
  const [appState, setAppState] = useState<AppState>("idle");
  const [error, setError] = useState<AppErrorCode | null>(null);
  const [transcript, setTranscript] = useState<TranscriptState>({
    sourceText: "",
    translatedText: "",
  });

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const directionRef = useRef<Direction>("me_to_partner");
  const sourceLanguageRef = useRef<LanguageCode>("ja");
  const targetLanguageRef = useRef<LanguageCode>("en");
  const currentSourceTextRef = useRef("");
  const currentTranslatedTextRef = useRef("");

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startSession = useCallback(
    async (direction: Direction, partnerLanguage: LanguageCode) => {
      setError(null);
      setTranscript({ sourceText: "", translatedText: "" });
      currentSourceTextRef.current = "";
      currentTranslatedTextRef.current = "";
      directionRef.current = direction;

      if (direction === "me_to_partner") {
        sourceLanguageRef.current = "ja";
        targetLanguageRef.current = partnerLanguage;
      } else {
        sourceLanguageRef.current = partnerLanguage;
        targetLanguageRef.current = "ja";
      }

      setAppState("connecting");

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      } catch {
        setError("microphone_permission_denied");
        setAppState("error");
        return;
      }

      let clientSecret: string;
      try {
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, partnerLanguage }),
        });
        if (!res.ok) throw new Error("session failed");
        const data = await res.json();
        clientSecret = data.clientSecret;
      } catch {
        setError("session_create_failed");
        setAppState("error");
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      try {
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }

        const audio = new Audio();
        audio.autoplay = true;
        audioRef.current = audio;

        pc.ontrack = (event) => {
          audio.srcObject = event.streams[0];
          setAppState("playing");
        };

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (
              data.type === "conversation.item.input_audio_transcription.delta"
            ) {
              currentSourceTextRef.current += data.delta ?? "";
              setTranscript((prev) => ({
                ...prev,
                sourceText: currentSourceTextRef.current,
              }));
            } else if (
              data.type ===
              "conversation.item.input_audio_transcription.completed"
            ) {
              currentSourceTextRef.current = data.transcript ?? currentSourceTextRef.current;
              setTranscript((prev) => ({
                ...prev,
                sourceText: currentSourceTextRef.current,
              }));
            } else if (data.type === "response.audio_transcript.delta") {
              currentTranslatedTextRef.current += data.delta ?? "";
              setTranscript((prev) => ({
                ...prev,
                translatedText: currentTranslatedTextRef.current,
              }));
            } else if (data.type === "response.audio_transcript.done") {
              currentTranslatedTextRef.current =
                data.transcript ?? currentTranslatedTextRef.current;
              setTranscript((prev) => ({
                ...prev,
                translatedText: currentTranslatedTextRef.current,
              }));
            } else if (data.type === "response.done") {
              setAppState("idle");
              const item: ConversationItem = {
                id: crypto.randomUUID(),
                direction: directionRef.current,
                sourceLanguage: sourceLanguageRef.current,
                targetLanguage: targetLanguageRef.current,
                sourceText: currentSourceTextRef.current,
                translatedText: currentTranslatedTextRef.current,
                createdAt: new Date().toISOString(),
              };
              if (item.sourceText || item.translatedText) {
                onConversationItem(item);
              }
            }
          } catch {
            // ignore parse errors
          }
        };

        dc.onerror = () => {
          setError("webrtc_connection_failed");
          setAppState("error");
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clientSecret}`,
              "Content-Type": "application/sdp",
            },
            body: offer.sdp,
          }
        );

        if (!sdpRes.ok) {
          throw new Error("SDP exchange failed");
        }

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({
          type: "answer",
          sdp: answerSdp,
        });

        setAppState("recording");
      } catch {
        setError("webrtc_connection_failed");
        setAppState("error");
        cleanup();
      }
    },
    [cleanup, onConversationItem]
  );

  const stopSession = useCallback(() => {
    if (appState === "recording") {
      setAppState("translating");
    }
    cleanup();
  }, [appState, cleanup]);

  return {
    appState,
    error,
    transcript,
    startSession,
    stopSession,
  };
}
