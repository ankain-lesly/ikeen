import { useState, useEffect } from 'react';
import type { Folder } from '@repo/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder as FolderIcon, Check, Trash2, AlertTriangle } from 'lucide-react';

const FOLDER_COLORS = [
  { label: 'Neon Green', hex: '#39ff14' },
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Purple', hex: '#8b5cf6' },
  { label: 'Pink', hex: '#ec4899' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Cyan', hex: '#06b6d4' },
  { label: 'Slate', hex: '#64748b' },
];

interface FolderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: Folder | null;
  onSave: (name: string, color: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function FolderEditDialog({
  open,
  onOpenChange,
  folder,
  onSave,
  onDelete,
}: FolderEditDialogProps) {
  const isEditing = Boolean(folder);

  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0].hex);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (folder) {
        setName(folder.name);
        setColor(folder.color || FOLDER_COLORS[1].hex);
      } else {
        setName('');
        setColor(FOLDER_COLORS[0].hex);
      }
      setIsDeleting(false);
      setIsSubmitting(false);
    }
  }, [open, folder]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSave(trimmed, color);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!folder || !onDelete || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDelete(folder.id);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card text-card-foreground border-border">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {isEditing ? 'Edit Folder' : 'New Folder'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditing
                ? 'Update folder name and custom label color.'
                : 'Create a new organized space for your notes.'}
            </DialogDescription>
          </DialogHeader>

          {/* Live Preview Pill */}
          <div className="flex items-center justify-center p-3 rounded-md bg-muted/30 border border-border">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border border-border shadow-xs text-xs font-medium">
              <FolderIcon className="w-4 h-4 shrink-0 transition-colors" style={{ color }} />
              <span className="truncate max-w-[200px]">{name.trim() || 'Folder Name'}</span>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <Label htmlFor="folder-name" className="text-xs font-medium">
              Folder Name
            </Label>
            <Input
              id="folder-name"
              placeholder="e.g. Work, Ideas, Architecture"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              autoFocus
              className="text-xs h-9 bg-muted/20"
            />
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color Label</Label>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {FOLDER_COLORS.map((c) => {
                const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border border-border/60 hover:border-border hover:bg-muted/40 transition-colors text-left"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-black stroke-[3]" />
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Destructive Delete Prompt (Edit Mode only) */}
          {isEditing && onDelete && (
            <div className="pt-2">
              {isDeleting ? (
                <div className="p-3 rounded-md border border-destructive/40 bg-destructive/10 space-y-2">
                  <div className="flex items-start gap-2 text-destructive text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Delete this folder?</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Notes inside this folder will not be deleted; they will be moved to Unfiled.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeleting(false)}
                      className="h-7 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="h-7 text-xs"
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleting(true)}
                  className="text-destructive hover:bg-destructive/10 text-xs gap-1.5 h-8 px-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Folder
                </Button>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || isSubmitting}
              className="text-xs bg-[#39ff14] text-black hover:bg-[#32e012] font-semibold"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
