import { useState, useMemo } from 'react';
import type { Note } from '@repo/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, StickyNote, Check } from 'lucide-react';

interface ScratchpadPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  currentScratchpadId?: string | null;
  onSelectNote: (noteId: string) => Promise<void>;
}

export function ScratchpadPickerModal({
  open,
  onOpenChange,
  notes,
  currentScratchpadId,
  onSelectNote,
}: ScratchpadPickerModalProps) {
  const [search, setSearch] = useState('');

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes.filter((n) => !n.deletedAt);
    return notes.filter(
      (n) =>
        !n.deletedAt &&
        (n.title.toLowerCase().includes(q) ||
          (n.content && n.content.toLowerCase().includes(q)))
    );
  }, [notes, search]);

  const handleSelect = async (noteId: string) => {
    await onSelectNote(noteId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-base font-semibold">Choose Scratchpad Note</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select an existing note to designate as your scratchpad. It will be archived to keep your active notes feed clean.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 pt-3 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="pl-9 h-9 text-xs bg-background"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {filteredNotes.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No matching notes found
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = note.id === currentScratchpadId;
                return (
                  <button
                    key={note.id}
                    onClick={() => handleSelect(note.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-[#39ff14]/60 bg-[#39ff14]/10'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className="w-7 h-7 rounded-md bg-background border border-border/60 flex items-center justify-center shrink-0">
                        <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {note.title || 'Untitled Note'}
                        </p>
                        {note.content ? (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {note.content}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#39ff14] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
