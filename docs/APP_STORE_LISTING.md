# App Store Listing

Paste-ready listing copy for App Store Connect and Google Play Console. Counts are characters, including spaces and punctuation. This document is store metadata only. Launch, IAP, and review-checklist work lives in [docs/analysis/COMMERCIALIZATION_AND_APP_STORE_ROADMAP.md](analysis/COMMERCIALIZATION_AND_APP_STORE_ROADMAP.md).

Claims below match what the app ships today: local notes, Markdown editing, folders, tags, pins, archive, search, bulk actions, Recently Deleted, folder PIN, light and dark appearance, optional account sync, and an agent that can search, write, organize, remember context, summarize, and use web research when that feature is enabled.

---

## Shared

| Field | Limit | Count | Copy |
| :--- | ---: | ---: | :--- |
| Name | 30 | 5 | `iKeen` |
| Primary category | — | — | Productivity |
| Age | — | — | 13+ (matches the privacy policy; complete the store questionnaires separately) |
| Copyright | — | — | `© 2026 [seller name on the developer account]` |

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

Keywords are comma-separated with no spaces. They do not repeat the name or subtitle words (`ikeen`, `offline`, `notes`, `optional`, `ai`).

### Description (limit 4000, count 1410)

```
iKeen is a notes app that works on your device. Write and organize without an account. Sign in when you want notes to sync across devices. Ask the agent when you want help with what you already wrote.

Write
Create and edit notes in Markdown. Add tags, pin important notes, and archive the ones you are finished with. Search titles and note text. Select several notes at once to move, pin, archive, or delete them. Deleted notes stay in Recently Deleted until you restore them or remove them for good. You can lock a folder with a PIN.

Organize
Keep notes in folders or leave them unorganized. Switch between a grid and a list. Use a light or dark appearance.

Ask iKeen
The agent can search your notes, create and update them, pin or archive them, and file them into folders. It can remember useful context from your conversation and summarize what you have collected. When web research is available, it can search the web and read a public page.

Your notes
Notes, folders, tags, and settings stay on the device. They are sent to iKeen only if you sign in and sync, or if you use the agent on that content. Agent prompts and the notes the agent reads are processed by the model provider so it can reply. iKeen does not show ads, and it does not ask for your camera, microphone, contacts, or location.

iKeen is for people 13 and older. The agent can be wrong. Check anything important before you rely on it.
```

---

## Google Play

| Field | Limit | Count | Copy |
| :--- | ---: | ---: | :--- |
| Name | 30 | 5 | `iKeen` |
| Short description | 80 | 72 | `Notes that stay on your device. Folders, tags, and an optional AI agent.` |

### Full description (limit 4000, count 1410)

Use the same body as the Apple description so the two listings do not drift.

```
iKeen is a notes app that works on your device. Write and organize without an account. Sign in when you want notes to sync across devices. Ask the agent when you want help with what you already wrote.

Write
Create and edit notes in Markdown. Add tags, pin important notes, and archive the ones you are finished with. Search titles and note text. Select several notes at once to move, pin, archive, or delete them. Deleted notes stay in Recently Deleted until you restore them or remove them for good. You can lock a folder with a PIN.

Organize
Keep notes in folders or leave them unorganized. Switch between a grid and a list. Use a light or dark appearance.

Ask iKeen
The agent can search your notes, create and update them, pin or archive them, and file them into folders. It can remember useful context from your conversation and summarize what you have collected. When web research is available, it can search the web and read a public page.

Your notes
Notes, folders, tags, and settings stay on the device. They are sent to iKeen only if you sign in and sync, or if you use the agent on that content. Agent prompts and the notes the agent reads are processed by the model provider so it can reply. iKeen does not show ads, and it does not ask for your camera, microphone, contacts, or location.

iKeen is for people 13 and older. The agent can be wrong. Check anything important before you rely on it.
```

---

## Do not claim

Leave these out of store copy, screenshots, and review notes until they ship:

- Voice capture or transcription
- Subscriptions, prices, or paid tiers
- Ads as a product feature
- Medical, legal, or financial advice
- Features that exist only in the brand spec or commercialization roadmap (runway tracking, morning briefings, Telegram ingestion, multi-agent routing)

Neither description names the other store, prices a plan, or stuffs keywords.

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
| Full description (both) | 4000 | 1410 |
