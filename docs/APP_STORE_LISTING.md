# App Store Listing

Paste-ready listing copy for App Store Connect and Google Play Console. Counts are characters, including spaces and punctuation. This document is store metadata only. Launch, IAP, and review-checklist work lives in [docs/analysis/COMMERCIALIZATION_AND_APP_STORE_ROADMAP.md](analysis/COMMERCIALIZATION_AND_APP_STORE_ROADMAP.md).

Claims below match what the app ships today: local notes, modular block editing (rich text, interactive checklists, voice notes, photo galleries), folders, tags, pins, archive, search, bulk actions, Recently Deleted, folder PIN, light and dark appearance, optional account sync, account deletion, and an agent that can search, write, organize, remember context, summarize, and use connected apps.

---

## Shared

| Field | Limit | Count | Copy |
| :--- | ---: | ---: | :--- |
| Name | 30 | 5 | `iKeen` |
| Primary category | — | — | Productivity |
| Age | — | — | 13+ (matches privacy policy; complete store questionnaires separately) |
| Copyright | — | — | `© 2026 [seller name on developer account]` |

Privacy policy URL and support URL are required by both consoles. The app already has `/privacy` and `/delete-account` routes. Fill in the public host before submission:

- Privacy policy: `https://[host]/privacy`
- Support / account deletion: `https://[host]/delete-account`

---

## Apple App Store

| Field | Limit | Count | Copy |
| :--- | ---: | ---: | :--- |
| Name | 30 | 5 | `iKeen` |
| Subtitle | 30 | 26 | `Offline notes, optional AI` |
| Promotional text | 170 | 148 | `iKeen keeps notes on your device. Organize them in folders, pin what matters, and ask the agent to search, draft, or tidy a note when you want help.` |
| Keywords | 100 | 97 | `folders,markdown,tags,sync,notebook,journal,archive,writing,organize,search,pin,local,draft,ideas` |

Keywords are comma-separated with no spaces. They do not repeat name or subtitle words (`ikeen`, `offline`, `notes`, `optional`, `ai`).

### Description (limit 4000, count 1671)

```
iKeen is a notes app that works on your device. Write and organize without an account. Sign in when you want notes to sync across devices. Ask the agent when you want help with what you already wrote.

Write
Create and edit notes with modular blocks: rich Markdown text, interactive checklists, voice memos, and photo attachments. Add tags, pin important notes, and archive finished items. Search titles and note content. Select several notes at once to move, pin, archive, or delete them. Deleted notes stay in Recently Deleted until you restore or purge them. You can lock private folders with a PIN.

Organize
Keep notes in folders or leave them unorganized. Switch between a grid and a list. Use a light or dark appearance. Access recent notes instantly with the sliding drawer.

Ask iKeen
The agent can search your notes, create and update them, pin or archive them, and file them into folders. It can remember useful context from your conversation and summarize what you have collected. When web research is available, it can search the web and read public pages. You can connect email and other apps from chat, then ask the agent to use them and save the result as a note.

Your notes
Notes, folders, tags, and settings stay on the device. They are sent to iKeen only if you sign in and sync, or if you use the agent on that content. Agent prompts and the notes the agent reads are processed by the model provider so it can reply. Connected-app data is used only when you authorize that app and ask the agent to use it. iKeen does not show ads, and does not ask for contacts or location.

iKeen is for people 13 and older. The agent can be wrong. Check anything important before you rely on it.
```

### What's New in Version 2.3.0
```
What's new in iKeen 2.3:
• External Share Target: Receive shared text, web links, images, and files directly from other apps into iKeen notes with seamless preview and note search.
• Custom Block Ingestion: Granular choice to create dedicated separate text/media blocks or append directly into existing note content.
• Enhanced Sync Outbox: Full desktop parity ledger with interactive status filtering (Pending, In Flight, Failed, Success) and mutation payload inspection.
• Offline Resilience: Network errors and timeouts no longer mark outbox tasks failed; automatic retry and clear controls.
• Agility in View Mode: Capture photos, record voice notes, attach files, append checklist items, and manage tags directly from the floating toolbar without opening the keyboard.
```

### What's New in Version 2.2.0
```
What's new in iKeen 2.2:
• Scratchpad Workspace: A dedicated quick-capture space for rapid idea dumping, draft outlines, and interactive checklists that syncs across devices without cluttering your main notes feed.
• Enhanced Note Reminders: Overdue reminder detection with prominent visual states and immediate revalidation.
• Editor Reminder Pills: View and manage scheduled note reminders directly at the bottom of the editor canvas.
• Cold-Start Deep Linking: Tapping a delivered reminder notification jumps directly to your note even if the app was closed.
• Stability & Performance: Hardened cloud sync with automatic background lifecycle saving and multi-tenant security isolation.
```

### What's New in Version 2.1.0
```
What's new in iKeen 2.1:
• Note Reminders: Schedule alerts and recurring reminders directly from notes, cards, and bulk actions.
• Server Push Notifications: Instant alerts when the AI Agent or tools create notes and schedule reminders.
• Interactive Reminder Chips: 1-tap circular completion button on note cards and a dedicated Reminders view.
• AI Chat Stream Fidelity: Real-time tool execution spinners, reliable actions, and schema error resilience.
• Account Privacy: Transparent in-app account and data deletion request directly in Profile settings.
```

---

## Google Play

| Field | Limit | Count | Copy |
| :--- | ---: | ---: | :--- |
| Name | 30 | 5 | `iKeen` |
| Short description | 80 | 72 | `Notes that stay on your device. Folders, tags, and an optional AI agent.` |

### Full description (limit 4000)
Use the same body as the Apple description so the two listings do not drift.

### What's New in Version 2.3.0
```
What's new in iKeen 2.3:
• External Share Target: Receive shared text, web links, images, and files directly from other apps into iKeen notes with seamless preview and note search.
• Custom Block Ingestion: Granular choice to create dedicated separate text/media blocks or append directly into existing note content.
• Enhanced Sync Outbox: Full desktop parity ledger with interactive status filtering (Pending, In Flight, Failed, Success) and mutation payload inspection.
• Offline Resilience: Network errors and timeouts no longer mark outbox tasks failed; automatic retry and clear controls.
• Agility in View Mode: Capture photos, record voice notes, attach files, append checklist items, and manage tags directly from the floating toolbar without opening the keyboard.
```

### What's New in Version 2.2.0
```
What's new in iKeen 2.2:
• Scratchpad Workspace: A dedicated quick-capture space for rapid idea dumping, draft outlines, and interactive checklists that syncs across devices without cluttering your main notes feed.
• Enhanced Note Reminders: Overdue reminder detection with prominent visual states and immediate revalidation.
• Editor Reminder Pills: View and manage scheduled note reminders directly at the bottom of the editor canvas.
• Cold-Start Deep Linking: Tapping a delivered reminder notification jumps directly to your note even if the app was closed.
• Stability & Performance: Hardened cloud sync with automatic background lifecycle saving and multi-tenant security isolation.
```

### What's New in Version 2.1.0
```
What's new in iKeen 2.1:
• Note Reminders: Schedule alerts and recurring reminders directly from notes, cards, and bulk actions.
• Server Push Notifications: Instant alerts when the AI Agent or tools create notes and schedule reminders.
• Interactive Reminder Chips: 1-tap circular completion button on note cards and a dedicated Reminders view.
• AI Chat Stream Fidelity: Real-time tool execution spinners, reliable actions, and schema error resilience.
• Account Privacy: Transparent in-app account and data deletion request directly in Profile settings.
```

---

## Character check

Recount after any edit, including spaces and line breaks, before pasting into App Store Connect or Play Console.

| Field | Limit | Current |
| :--- | ---: | ---: |
| Name | 30 | 5 |
| Apple subtitle | 30 | 26 |
| Apple promotional text | 170 | 148 |
| Apple keywords | 100 | 97 |
| Google short description | 80 | 72 |
| Full description (both) | 4000 | 1680 |
