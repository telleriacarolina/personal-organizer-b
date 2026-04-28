import { useState } from 'react';
import { WidgetContainer } from '@/components/WidgetContainer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Note as NoteIcon, Plus, Trash } from '@phosphor-icons/react';
import { Note, WidgetSize } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotesWidgetProps {
  notes: Note[];
  onUpdate: (notes: Note[]) => void;
  onRemove: () => void;
  widgetId: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
}

export function NotesWidget({ notes, onUpdate, onRemove, widgetId, onDragStart, onDragEnd, size, onSizeChange }: NotesWidgetProps) {
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const addNote = () => {
    if (newTitle.trim() || newContent.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        title: newTitle || 'Untitled Note',
        content: newContent,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onUpdate([...notes, note]);
      setNewTitle('');
      setNewContent('');
      setShowNew(false);
    }
  };

  const deleteNote = (id: string) => {
    onUpdate(notes.filter((note) => note.id !== id));
  };

  const updateNote = (id: string, title: string, content: string) => {
    onUpdate(
      notes.map((note) =>
        note.id === id
          ? { ...note, title, content, updatedAt: Date.now() }
          : note
      )
    );
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
