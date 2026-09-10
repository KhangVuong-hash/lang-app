'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AudioRecorder({
  segmentId,
  existingUrl,
}: {
  segmentId: string;
  existingUrl?: string | null;
}) {
  const supabase = createClient();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(existingUrl ?? null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setLocalUrl(URL.createObjectURL(blob));
      await uploadRecording(blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadRecording(blob: Blob) {
    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = `${user?.id}/${segmentId}-${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage.from('speaking-recordings').upload(path, blob, {
      contentType: 'audio/webm',
    });

    if (!uploadError) {
      await supabase.from('speaking_submissions').insert({
        segment_id: segmentId,
        student_id: user?.id,
        audio_storage_path: path,
      });
    }
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button
          onClick={startRecording}
          className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:bg-paper"
          title="Ghi âm shadowing câu này"
        >
          <Mic className="h-3 w-3" /> Ghi âm
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="inline-flex items-center gap-1 rounded-md border border-danger/50 bg-danger/10 px-2 py-1 text-xs text-danger"
        >
          <Square className="h-3 w-3" /> Dừng
        </button>
      )}
      {uploading && <span className="text-xs text-ink-faint">Đang lưu...</span>}
      {localUrl && !uploading && <audio src={localUrl} controls className="h-7 max-w-[140px]" />}
    </div>
  );
}
