import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AISuggestionsPanel } from '@/components/AISuggestionsPanel';
import { Note as NoteIcon, Plus, Trash, Sparkle } from '@phosphor-icons/react';
import { AIInsightAction, Note, Task, WidgetAIState, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildAIInputHash, generateWidgetAIState, updateAIInsightStatus } from '@/lib/ai-organizer';
import { toast } from 'sonner';
import { addNote as addNoteCommand, deleteNote as deleteNoteCommand, updateNote as updateNoteCommand } from '@/lib/organizer-commands';

interface NotesWidgetProps {
  notes: Note[];
  onUpdate: (notes: Note[]) => void;
  taskSources: { id: string; tasks: Task[] }[];
  aiState?: WidgetAIState;
  onAIStateChange: (state: WidgetAIState) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

export function NotesWidget({
  notes,
  onUpdate,
  taskSources,
  aiState,
  onAIStateChange,
  onRemove,
  widgetId,
  onDragStart,
  onDragEnd,
  size,
  onSizeChange,
}: NotesWidgetProps) {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedTaskSourceId, setSelectedTaskSourceId] = useState<string>(taskSources[0]?.id || '');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);

  const addNote = () => {
    if (newTitle.trim() || newContent.trim()) {
      onUpdate(addNoteCommand(notes, newTitle, newContent));
      setNewTitle('');
      setNewContent('');
      setShowNew(false);
    }
  };

  const deleteNote = (id: string) => {
    onUpdate(deleteNoteCommand(notes, id));
  };

  const updateNote = (id: string, title: string, content: string) => {
    onUpdate(updateNoteCommand(notes, id, title, content));
  };

  const aiInput = { notes };
  const isAIStale = aiState ? aiState.sourceHash !== buildAIInputHash(aiInput) : false;

  const updateInsightStatus = (insightId: string, status: 'applied' | 'dismissed') => {
    if (!aiState) return;
    onAIStateChange(updateAIInsightStatus(aiState, insightId, status));
  };

  const handleGenerateInsights = async () => {
    if (notes.length === 0) {
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const nextState = await generateWidgetAIState({
        widgetId,
        feature: 'notes',
        input: { notes },
        dataSummary: [
          'Feature: note-to-task and summary review',
          `${notes.length} notes considered`,
          `${taskSources.length} Tasks widget destination${taskSources.length === 1 ? '' : 's'} available`,
          'Extracted tasks must be reviewed before sending them to Tasks',
        ],
      });
      onAIStateChange(nextState);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleApplyAction = (insightId: string, action: AIInsightAction) => {
    void insightId;
    void action;
    toast.info('AI apply actions will be enabled in Phase 2');
  };

  return (
    <WidgetContainer 
      title="Notes" 
      icon={<NoteIcon size={24} />} 
      onRemove={onRemove}
      value={{ id: widgetId, type: 'notes', notes }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      size={size}
      onSizeChange={onSizeChange}
      widgetType="notes"
    >
      <div className="space-y-3">
        {showAIPanel ? (
          <AISuggestionsPanel
            title="AI Note Assistant"
            featureLabel="notes"
            state={aiState}
            isGenerating={isGeneratingInsights}
            isStale={isAIStale}
            onGenerate={handleGenerateInsights}
            onApplyAction={handleApplyAction}
            onDismissInsight={(insightId) => updateInsightStatus(insightId, 'dismissed')}
            onClose={() => setShowAIPanel(false)}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-muted-foreground w-full"
            onClick={() => setShowAIPanel(true)}
          >
            <Sparkle size={13} />
            Show AI Suggestions
          </Button>
        )}

        <div className="space-y-2">
          <Label htmlFor={`notes-task-source-${widgetId}`} className="text-xs text-muted-foreground">
            Task destination
          </Label>
          <Select
            value={selectedTaskSourceId}
            onValueChange={setSelectedTaskSourceId}
            disabled={taskSources.length === 0}
          >
            <SelectTrigger id={`notes-task-source-${widgetId}`}>
              <SelectValue placeholder="Select Tasks widget" />
            </SelectTrigger>
            <SelectContent>
              {taskSources.map((source, index) => (
                <SelectItem key={source.id} value={source.id}>
                  Tasks Widget {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!showNew && (
        <Button
          onClick={() => setShowNew(true)}
          className="w-full"
          variant="outline"
        >
          <Plus size={18} className="mr-2" />
          New Note
        </Button>
      )}

      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 border border-border rounded-lg p-3 bg-background"
          >
            <Input
              id="note-title"
              placeholder="Note title..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              id="note-content"
              placeholder="Write your note..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={addNote} size="sm">
                Save
              </Button>
              <Button
                onClick={() => {
                  setShowNew(false);
                  setNewTitle('');
                  setNewContent('');
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          <AnimatePresence>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={deleteNote}
                onUpdate={updateNote}
              />
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {notes.length === 0 && !showNew && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No notes yet. Create one to get started!
        </div>
      )}
    </WidgetContainer>
  );
}

interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, content: string) => void;
}

function NoteCard({ note, onDelete, onUpdate }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const handleSave = () => {
    onUpdate(note.id, title, content);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="border border-border rounded-lg p-3 bg-background hover:border-primary/30 transition-colors group"
    >
      {isEditing ? (
        <div className="space-y-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-medium"
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setTitle(note.title);
                setContent(note.content);
              }}
              size="sm"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-foreground">{note.title}</h3>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7"
              >
                <NoteIcon size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(note.id)}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash size={14} />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {note.content}
          </p>
        </>
      )}
    </motion.div>
  );
}
