import { useState, useRef, useEffect } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Microphone,
  VideoCamera,
  Camera,
  Stop,
  Play,
  Pause,
  Trash,
  Record,
} from '@phosphor-icons/react';
import { RecordNote, RecordNoteMediaType, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface RecordNoteWidgetProps {
  records: RecordNote[];
  onUpdate: (records: RecordNote[]) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  snapToGrid?: boolean;
  globalLock?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'preview';

export function RecordNoteWidget({
  records,
  onUpdate,
  onRemove,
  widgetId,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
  snapToGrid,
  globalLock,
}: RecordNoteWidgetProps) {
  const [activeMode, setActiveMode] = useState<RecordNoteMediaType | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [pendingTitle, setPendingTitle] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimerInterval = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const releaseStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimerInterval();
      releaseStream();
    };
  }, []);

  const startRecording = async (mode: RecordNoteMediaType) => {
    setPreviewDataUrl(null);
    setPreviewDuration(0);
    setRecordingDuration(0);
    setPendingTitle('');
    setActiveMode(mode);

    const constraints: MediaStreamConstraints =
      mode === 'voice'
        ? { audio: true }
        : mode === 'video'
        ? { audio: true, video: true }
        : { video: true, audio: false };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      toast.error('Could not access media device. Please check permissions.');
      setActiveMode(null);
      return;
    }

    streamRef.current = stream;

    if (mode !== 'voice' && liveVideoRef.current) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }

    // For photo mode, capture a single frame immediately
    if (mode === 'photo') {
      capturePhoto(stream);
      return;
    }

    const mimeType = mode === 'voice' ? 'audio/webm' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      // Convert to a data URL so the recording survives page reloads in localStorage
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewDataUrl(reader.result as string);
        setRecordingState('preview');
      };
      reader.readAsDataURL(blob);
      releaseStream();
      stopTimerInterval();
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecordingState('recording');

    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  };

  const capturePhoto = (stream: MediaStream) => {
    // Give video a moment to initialise before grabbing a frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play().then(() => {
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewDataUrl(dataUrl);
        setRecordingState('preview');
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }, 300);
    }).catch(() => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecordingState('idle');
      setActiveMode(null);
      toast.error('Could not capture photo. Please try again.');
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setPreviewDuration(recordingDuration);
      mediaRecorderRef.current.stop();
    }
    stopTimerInterval();
  };

  const cancelPreview = () => {
    if (previewDataUrl && !previewDataUrl.startsWith('data:')) {
      URL.revokeObjectURL(previewDataUrl);
    }
    setPreviewDataUrl(null);
    setRecordingState('idle');
    setActiveMode(null);
    setPendingTitle('');
    releaseStream();
    stopTimerInterval();
  };

  const saveRecord = () => {
    if (!previewDataUrl || !activeMode) return;
    const title = pendingTitle.trim() || defaultTitle(activeMode);
    const newRecord: RecordNote = {
      id: Date.now().toString(),
      title,
      mediaType: activeMode,
      dataUrl: previewDataUrl,
      duration: activeMode !== 'photo' ? previewDuration : undefined,
      createdAt: Date.now(),
    };
    onUpdate([...records, newRecord]);
    toast.success(`${label(activeMode)} saved!`);
    setPreviewDataUrl(null);
    setRecordingState('idle');
    setActiveMode(null);
    setPendingTitle('');
  };

  const deleteRecord = (id: string) => {
    const rec = records.find((r) => r.id === id);
    if (rec && !rec.dataUrl.startsWith('data:')) {
      URL.revokeObjectURL(rec.dataUrl);
    }
    onUpdate(records.filter((r) => r.id !== id));
    toast.success('Record deleted');
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <WidgetContainer
      title="Record Note"
      icon={<Record size={24} />}
      onRemove={onRemove}
      value={{ id: widgetId, type: 'record-note', records }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      snapToGrid={snapToGrid}
      globalLock={globalLock}
      widgetType="record-note"
    >
      {/* Mode selector */}
      {recordingState === 'idle' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('voice')}
          >
            <Microphone size={22} className="text-primary" />
            <span className="text-xs">Voice</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('video')}
          >
            <VideoCamera size={22} className="text-primary" />
            <span className="text-xs">Video</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('photo')}
          >
            <Camera size={22} className="text-primary" />
            <span className="text-xs">Photo</span>
          </Button>
        </div>
      )}

      {/* Live recording view */}
      <AnimatePresence>
        {recordingState === 'recording' && activeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {activeMode !== 'voice' && (
              <video
                ref={liveVideoRef}
                className="w-full rounded-lg bg-black aspect-video object-cover"
                muted
                playsInline
              />
            )}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse inline-block" />
                {activeMode === 'voice' ? 'Recording audio' : 'Recording video'}
              </div>
              <span className="font-mono text-sm font-medium">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button variant="destructive" className="w-full gap-2" onClick={stopRecording}>
              <Stop size={18} />
              Stop Recording
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview / save view */}
      <AnimatePresence>
        {recordingState === 'preview' && previewDataUrl && activeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 border border-border rounded-lg p-3 bg-background"
          >
            <MediaPreview dataUrl={previewDataUrl} mediaType={activeMode} />

            <Input
              placeholder={`Title for this ${label(activeMode).toLowerCase()}…`}
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
            />

            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveRecord}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={cancelPreview}>
                Discard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Records list */}
      <ScrollArea className="h-[320px]">
        <div className="space-y-2 pr-2">
          <AnimatePresence>
            {records.map((rec) => (
              <RecordCard key={rec.id} record={rec} onDelete={deleteRecord} />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {records.length === 0 && recordingState === 'idle' && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No records yet. Tap Voice, Video, or Photo to get started!
        </div>
      )}
    </WidgetContainer>
  );
}

// ---------- helpers ----------

function label(mode: RecordNoteMediaType) {
  return mode === 'voice' ? 'Voice memo' : mode === 'video' ? 'Video' : 'Photo';
}

function defaultTitle(mode: RecordNoteMediaType) {
  return `${label(mode)} – ${new Date().toLocaleString()}`;
}

// ---------- sub-components ----------

function MediaPreview({ dataUrl, mediaType }: { dataUrl: string; mediaType: RecordNoteMediaType }) {
  if (mediaType === 'photo') {
    return (
      <img
        src={dataUrl}
        alt="Captured photo"
        className="w-full rounded-lg object-cover max-h-48"
      />
    );
  }
  if (mediaType === 'video') {
    return (
      <video
        src={dataUrl}
        controls
        className="w-full rounded-lg aspect-video bg-black"
        playsInline
      />
    );
  }
  return (
    <audio src={dataUrl} controls className="w-full" />
  );
}

interface RecordCardProps {
  record: RecordNote;
  onDelete: (id: string) => void;
}

function RecordCard({ record, onDelete }: RecordCardProps) {
  const [expanded, setExpanded] = useState(false);

  const mediaIcon =
    record.mediaType === 'voice' ? (
      <Microphone size={16} className="text-primary" />
    ) : record.mediaType === 'video' ? (
      <VideoCamera size={16} className="text-primary" />
    ) : (
      <Camera size={16} className="text-primary" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="border border-border rounded-lg p-3 bg-background hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {mediaIcon}
          <button
            className="text-sm font-medium text-foreground truncate text-left hover:text-primary transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {record.title}
          </button>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {record.mediaType === 'voice' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={expanded ? 'Collapse' : 'Play'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Pause size={14} /> : <Play size={14} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(record.id)}
          >
            <Trash size={14} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            {record.mediaType === 'photo' && (
              <img
                src={record.dataUrl}
                alt={record.title}
                className="w-full rounded object-cover max-h-48"
              />
            )}
            {record.mediaType === 'video' && (
              <video
                src={record.dataUrl}
                controls
                className="w-full rounded aspect-video bg-black"
                playsInline
              />
            )}
            {record.mediaType === 'voice' && (
              <audio
                src={record.dataUrl}
                className="w-full"
                controls
                autoPlay
              />
            )}
            {record.transcription && (
              <p className="mt-2 text-xs text-muted-foreground">{record.transcription}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground mt-1">
        {new Date(record.createdAt).toLocaleString()}
        {record.duration !== undefined && ` · ${Math.floor(record.duration / 60)}:${String(record.duration % 60).padStart(2, '0')}`}
      </p>
    </motion.div>
  );
}
