import { count } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { notes } from './schema';
import * as schema from './schema';

/**
 * Seeds initial onboarding notes into the SQLite database if empty.
 * Idempotent: safe to call on every app startup.
 */
export async function seedDefaultNotes(db: ExpoSQLiteDatabase<typeof schema>): Promise<void> {
  try {
    // await db.delete(notes);

    const result = await db.select({ total: count() }).from(notes);
    const totalNotes = result[0]?.total ?? 0;

    if (totalNotes > 0) {
      return;
    }

    const now = new Date().toISOString();

    await db.insert(notes).values([
      {
        id: 'welcome-note',
        title: 'Welcome to iKeen ✨',
        content:
          'iKeen is a fast, local-first notes and thinking space.\n\n' +
          '• Local-First: All notes live directly on your device via SQLite.\n' +
          '• Instant: Real-time queries with live updates.\n' +
          '• Offline-First: Works with zero internet connection.\n\n' +
          'Pin notes to keep them at the top, or archive them when finished.',
        tags: JSON.stringify(['welcome', 'guide']),
        isPinned: true,
        isArchived: false,
        summary: 'Introduction to iKeen features and local-first SQLite architecture.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'quick-tips-note',
        title: 'Quick Tips & Markdown 🚀',
        content:
          'A few helpful tips to get the most out of iKeen:\n\n' +
          '1. Tagging: Organize notes with tags like #ideas, #meeting, or #project.\n' +
          '2. Pinning: Tap the pin icon on key thoughts for rapid access.\n' +
          '3. Search: Fast substring and full-text search across titles and contents.',
        tags: JSON.stringify(['tips', 'markdown']),
        isPinned: false,
        isArchived: false,
        summary: 'Tips for organizing notes, tagging, and searching.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'project-ideas-note',
        title: 'App Architecture & Brainstorming 💡',
        content:
          'Key ideas for upcoming features:\n\n' +
          '• Offline sync queue with conflict resolution\n' +
          '• Biometric lock for sensitive thoughts\n' +
          '• Export notes to Markdown or JSON format\n' +
          '• Color-coded tag filters',
        tags: JSON.stringify(['ideas', 'roadmap']),
        isPinned: false,
        isArchived: false,
        summary: 'Brainstorming roadmap for future local-first capabilities.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'markdown-demo-note',
        title: 'Markdown Demo 📒',
        content:
          'iKeen supports basic Markdown formatting:\n\n' +
          '# Big Heading\n' +
          '## Medium Heading\n' +
          '**Bold** _Italic_ `Code`\n\n' +
          '- Lists\n' +
          '- [ ] Tasks\n' +
          '- [x] Completed tasks\n\n> Quotes, checkboxes, and monospaced styles are supported.\n\n' +
          'Check the preview above your keyboard!',
        tags: JSON.stringify(['markdown', 'demo']),
        isPinned: false,
        isArchived: false,
        summary: 'Sample note demonstrating supported markdown formats.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'your-first-task-list-note',
        title: 'Your First Task List ✅',
        content:
          'You can use task lists for rapid checklists:\n\n' +
          '- [ ] Buy groceries\n' +
          '- [ ] Read a book\n' +
          '- [x] Try creating a new note\n' +
          '- [ ] Pin this note for quick access\n\n' +
          'Tasks can be toggled directly in the note preview, once supported!',
        tags: JSON.stringify(['tasks', 'checklist']),
        isPinned: false,
        isArchived: false,
        summary: 'Checklist example using markdown task syntax.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'archive-note-demo',
        title: 'Archiving Notes 🗄️',
        content:
          'You can archive notes to clear your workspace without deleting anything.\n\n' +
          '• Tap the Archive button from the note editor.\n' +
          '• Archived notes are hidden from All/Pinned views by default.\n' +
          '• Find them anytime on the "Archived" tab.',
        tags: JSON.stringify(['archive', 'workflow']),
        isPinned: false,
        isArchived: false,
        summary: 'How archiving works in iKeen and how to retrieve archived notes.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tagging-organization-note',
        title: 'Organize with Tags 🏷️',
        content:
          'Tags make finding, filtering, and organizing your thoughts effortless.\n\n' +
          '• Add tags like #work, #learning, or #ideas to any note.\n' +
          '• Filter by tag using the search or tag chips in the UI.\n' +
          '• Each note can have any number of tags—think of them as folders for your brain!',
        tags: JSON.stringify(['tags', 'organization']),
        isPinned: false,
        isArchived: false,
        summary: 'Introduction to organizing notes with tags for fast retrieval.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'local-offline-note',
        title: 'Works 100% Offline 🌐',
        content:
          'Never lose a thought due to spotty Wi-Fi! All your notes are always available—even on flights, subways, or in airplane mode.\n\n' +
          '• Everything is stored locally via fast SQLite\n' +
          '• No signup required, no cloud dependency\n' +
          '• Seamless offline and online experience',
        tags: JSON.stringify(['offline', 'local-first']),
        isPinned: false,
        isArchived: false,
        summary: 'Details on offline capabilities and privacy via local storage.',
        createdAt: now,
        updatedAt: now,
      }
    ]);
  } catch (error) {
    console.error('Failed to seed default notes:', error);
  }
}
