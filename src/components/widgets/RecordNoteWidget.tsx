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
import { selectMimeType, label, defaultTitle, formatDuration } from './recordNoteUtils';
import { CollectionMutation, createItem, deleteItem } from '@/lib/atomic-state';
import { createId } from '@/lib/id';

interface RecordNoteWidgetProps {
  records: RecordNote[];
  onUpdate: (mutation: CollectionMutation<RecordNote>) => void;
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

const MAX_RECORDING_SECONDS = 300;
const MAX_RECORDING_BYTES = 25 * 1024 * 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

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
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingTitle, setPendingTitle] = useState('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<number>(0);
  const acquiringRef = useRef(false);

  useEffect(() => {
    if (!previewBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewBlob]);

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

  useEffect(() => {
    if (recordingState === 'recording' && activeMode === 'video' && liveVideoRef.current && streamRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [recordingState, activeMode]);

  useEffect(
    () => () => {
      stopTimerInterval();
      releaseStream();
    },
    []
  );

  const startRecording = async (mode: RecordNoteMediaType) => {
    if (acquiringRef.current || recordingState !== 'idle') return;
    acquiringRef.current = true;

    setPreviewBlob(null);
    setRecordingDuration(0);
    durationRef.current = 0;
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
      acquiringRef.current = false;
      return;
    }

    acquiringRef.current = false;
    streamRef.current = stream;

    if (mode === 'photo') {
      void capturePhoto(stream);
      return;
    }

    const mimeType = selectMimeType(mode);
    const recorderOptions = mimeType ? { mimeType } : {};
    const recorder = new MediaRecorder(stream, recorderOptions);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const effectiveMime = mimeType || recorder.mimeType;
      const blob = new Blob(chunksRef.current, { type: effectiveMime });
      try {
        assertMaxBytes(blob, MAX_RECORDING_BYTES, 'Recording');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Recording is too large');
        setRecordingState('idle');
        setActiveMode(null);
        releaseStream();
        stopTimerInterval();
        return;
      }
      setPreviewBlob(blob);
      setRecordingState('preview');
      releaseStream();
      stopTimerInterval();
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecordingState('recording');

    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => {
        const next = d + 1;
        durationRef.current = next;
        if (next >= MAX_RECORDING_SECONDS) {
          stopRecording();
          toast.info('Recording stopped at 5 minutes for privacy and storage limits.');
        }
        return next;
      });
    }, 1000);
  };

  const capturePhoto = async (stream: MediaStream) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;

    const cleanup = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    video.addEventListener('loadedmetadata', () => {
      video
        .play()
        .then(async () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            setRecordingState('idle');
            setActiveMode(null);
            toast.error('Canvas not supported in this browser.');
            return;
          }
          ctx.drawImage(video, 0, 0);
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
          cleanup();
          if (!blob) {
            toast.error('Could not capture photo. Please try again.');
            setRecordingState('idle');
            setActiveMode(null);
            return;
          }
          try {
            assertMaxBytes(blob, MAX_PHOTO_BYTES, 'Photo');
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Photo is too large');
            setRecordingState('idle');
            setActiveMode(null);
            return;
          }
          setPreviewBlob(blob);
          setRecordingState('preview');
        })
        .catch(() => {
          cleanup();
          setRecordingState('idle');
          setActiveMode(null);
          toast.error('Could not capture photo. Please try again.');
        });
    });

    video.addEventListener('error', () => {
      cleanup();
      setRecordingState('idle');
      setActiveMode(null);
      toast.error('Could not capture photo. Please try again.');
    });

    video.load();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopTimerInterval();
  };

  const cancelPreview = () => {
    setPreviewBlob(null);
    setRecordingState('idle');
    setActiveMode(null);
    setPendingTitle('');
    releaseStream();
    stopTimerInterval();
  };

  const saveRecord = async () => {
    if (!previewBlob || !activeMode) return;
    const title = pendingTitle.trim() || defaultTitle(activeMode);
    const newRecord: RecordNote = {
      id: createId('record-note'),
      title,
      mediaType: activeMode,
      dataUrl: previewDataUrl,
      // Use the ref value — never stale React state
      duration: activeMode !== 'photo' ? durationRef.current : undefined,
      createdAt: Date.now(),
    };
    onUpdate(createItem(newRecord));
    toast.success(`${label(activeMode)} saved!`);
    setPreviewDataUrl(null);
    setRecordingState('idle');
    setActiveMode(null);
    setPendingTitle('');
  };

  const deleteRecord = (id: string) => {
    onUpdate(deleteItem(id));
    toast.success('Record deleted');
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
      {recordingState === 'idle' && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('voice')}
            aria-label="Record voice memo"
          >
            <Microphone size={22} className="text-primary" />
            <span className="text-xs">Voice</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('video')}
            aria-label="Record video"
          >
            <VideoCamera size={22} className="text-primary" />
            <span className="text-xs">Video</span>
          </Button>
          <Button
            variant="outline"
            className="flex-1 flex-col h-auto gap-1 py-3 hover:border-primary hover:bg-primary/5"
            onClick={() => startRecording('photo')}
            aria-label="Capture photo"
          >
            <Camera size={22} className="text-primary" />
            <span className="text-xs">Photo</span>
          </Button>
        </div>
      )}

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
                aria-label="Live camera preview"
              />
            )}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse inline-block" aria-hidden="true" />
                {activeMode === 'voice' ? 'Recording audio' : 'Recording video'}
              </div>
              <span className="font-mono text-sm font-medium" aria-live="polite" aria-label={`Elapsed: ${formatDuration(recordingDuration)}`}>
                {formatDuration(recordingDuration)} / 05:00
              </span>
            </div>
            <Button variant="destructive" className="w-full gap-2" onClick={stopRecording}>
              <Stop size={18} />
              Stop Recording
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recordingState === 'preview' && previewUrl && activeMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 border border-border rounded-lg p-3 bg-background"
          >
            <MediaPreview dataUrl={previewUrl} mediaType={activeMode} />

            <Input
              placeholder={`Title for this ${label(activeMode).toLowerCase()}…`}
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
              aria-label="Recording title"
            />

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void saveRecord()}>
                Save
              </Button>
              <Button variant="outline" className="flex-1" onClick={cancelPreview}>
                Discard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function MediaPreview({ dataUrl, mediaType }: { dataUrl: string; mediaType: RecordNoteMediaType }) {
  if (mediaType === 'photo') {
    return (
      <img
        src={dataUrl}
        alt="Captured photo preview"
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
  return <audio src={dataUrl} controls className="w-full" />;
}

function useRecordMediaUrl(record: RecordNote): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const mediaRefId = record.mediaRef?.id;
  useEffect(() => {
    let disposed = false;
    let currentObjectUrl: string | null = null;
    if (record.dataUrl) {
      setUrl(record.dataUrl);
      return;
    }
    if (!mediaRefId) {
      setUrl(null);
      return;
    }

    void (async () => {
      try {
        const blob = await getMediaBlob(mediaRefId);
        if (disposed || !blob) {
          if (!disposed) setUrl(null);
          return;
        }
        currentObjectUrl = URL.createObjectURL(blob);
        setUrl(currentObjectUrl);
      } catch {
        if (!disposed) setUrl(null);
      }
    })();

    return () => {
      disposed = true;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    };
  }, [record.id, record.dataUrl, mediaRefId]);

  return url;
}

interface RecordCardProps {
  record: RecordNote;
  onDelete: (record: RecordNote) => void;
}

function RecordCard({ record, onDelete }: RecordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const mediaUrl = useRecordMediaUrl(record);

  const mediaIcon =
    record.mediaType === 'voice' ? (
      <Microphone size={16} className="text-primary" aria-hidden="true" />
    ) : record.mediaType === 'video' ? (
      <VideoCamera size={16} className="text-primary" aria-hidden="true" />
    ) : (
      <Camera size={16} className="text-primary" aria-hidden="true" />
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
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${record.title}`}
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
              aria-label={expanded ? 'Collapse recording' : 'Play recording'}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <Pause size={14} /> : <Play size={14} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => void onDelete(record)}
            aria-label={`Delete ${record.title}`}
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
            {!mediaUrl ? (
              <p className="text-xs text-muted-foreground">Media unavailable. The stored blob may have been deleted.</p>
            ) : (
              <>
                {record.mediaType === 'photo' && (
                  <img
                    src={mediaUrl}
                    alt={record.title}
                    className="w-full rounded object-cover max-h-48"
                  />
                )}
                {record.mediaType === 'video' && (
                  <video
                    src={mediaUrl}
                    controls
                    className="w-full rounded aspect-video bg-black"
                    playsInline
                  />
                )}
                {record.mediaType === 'voice' && (
                  <audio src={mediaUrl} className="w-full" controls />
                )}
              </>
            )}
            {record.transcription && (
              <p className="mt-2 text-xs text-muted-foreground">{record.transcription}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-muted-foreground mt-1">
        {new Date(record.createdAt).toLocaleString()}
        {record.duration !== undefined &&
          ` · ${Math.floor(record.duration / 60)}:${String(record.duration % 60).padStart(2, '0')}`}
      </p>
    </motion.div>
  );
}
