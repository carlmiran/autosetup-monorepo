"use client";

// AUTOSETUP — apps/core/web/src/components/CampoTextoComAudio.tsx
// Campo de texto com opção real de gravar áudio em vez de digitar.
// Grava via MediaRecorder do navegador, envia pra /api/transcrever
// (Whisper real), e o texto transcrito entra no campo — a pessoa pode
// editar depois se quiser. Nunca finge transcrição: qualquer falha
// aparece como erro real, nunca texto inventado.

import { useRef, useState } from "react";

interface CampoTextoComAudioProps {
  label: string;
  ajuda: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function CampoTextoComAudio({
  label,
  ajuda,
  placeholder,
  value,
  onChange,
  required,
}: CampoTextoComAudioProps) {
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function iniciarGravacao() {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcrever(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setGravando(true);
    } catch {
      setErro("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  }

  async function transcrever(blob: Blob) {
    setTranscrevendo(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob);
      const res = await fetch("/api/transcrever", { method: "POST", body: formData });
      const data = (await res.json()) as { texto?: string; error?: string };
      if (!res.ok) {
        setErro(data.error ?? "Erro ao transcrever o áudio.");
      } else {
        const novoTexto = value ? `${value}\n${data.texto}` : data.texto ?? "";
        onChange(novoTexto);
      }
    } catch {
      setErro("Não foi possível enviar o áudio pra transcrição.");
    } finally {
      setTranscrevendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <button
          type="button"
          onClick={gravando ? pararGravacao : iniciarGravacao}
          disabled={transcrevendo}
          className={`text-xs rounded px-3 py-1 border ${
            gravando ? "bg-red-600 text-white border-red-600" : "border-neutral-300"
          }`}
        >
          {transcrevendo ? "Transcrevendo..." : gravando ? "⏹ Parar" : "🎙️ Gravar áudio"}
        </button>
      </div>
      <p className="text-xs text-neutral-500">{ajuda}</p>
      <textarea
        required={required}
        placeholder={placeholder}
        className="border rounded px-3 py-2"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
