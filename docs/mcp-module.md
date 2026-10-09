Here are the practical ways to test your iKeen MCP server, ranging from an interactive UI to raw HTTP calls and real AI clients:

---

### Step 1: Start the API Server Locally

Make sure your database is running and start the backend:

```bash
# From the repository root
bun run --filter=@repo/api start:dev
```
Your server will start (defaulting to `http://localhost:3001` or whatever `PORT` is set in your `.env`).

---

### Step 2: Get a Test API Key (PAT)

Generate a token for your user account:

```bash
# 1. Login to get your JWT (if not already logged in)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com", "password": "your-password"}'

# 2. Create an MCP API Key (replace <JWT_TOKEN> with your access token)
curl -X POST http://localhost:3001/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"name": "Local MCP Test"}'
  
# 3. Get MCP API Keys
curl -X GET http://localhost:3001/api/v1/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```


The response will return your raw key:
```json
{
  "id": "...",
  "name": "Local MCP Test",
  "keyPrefix": "ikn_live_a1b2c3d4",
  "rawKey": "ikn_live_a1b2c3d4e5f6..."
}
```
*(Copy `rawKey` — it starts with `ikn_live_`)*

---

### Step 3: Test Options

#### Option A: Interactive MCP Inspector (Recommended)
Anthropic's official MCP Inspector gives you a full GUI to view, test, and debug all tools, resources, and prompts:

```bash
npx @modelcontextprotocol/inspector
```
1. In the browser window that opens, set **Transport Type** to `Streamable HTTP` (or `HTTP`).
2. **URL**: `http://localhost:3001/mcp`
3. Click **Add Header**:
   - Name: `x-api-key` (or `Authorization`)
   - Value: `ikn_live_...` (or `Bearer ikn_live_...`)
4. Click **Connect**:
   - Go to **Tools** tab: You will see `ikeen_search_notes`, `ikeen_create_note`, `ikeen_list_folders`, etc.
   - Click `ikeen_create_note` → enter `{ "title": "Test Note", "content": "Hello from MCP!" }` → click **Run Tool**.
   - Go to **Resources** tab: Inspect `ikeen://notes/recent`.

---

#### Option B: Fast cURL Test (JSON-RPC)

You can send a direct JSON-RPC request to verify the server answers:

**1. List available tools:**
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: ikn_live_<your_key>" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

**2. Execute a tool (`ikeen_search_notes`):**
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "x-api-key: ikn_live_<your_key>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "ikeen_search_notes",
      "arguments": { "query": "Test" }
    }
  }'
```

---

#### Option C: In Cursor (`.cursor/mcp.json`)

To have Cursor's AI agent access your local iKeen server:

Create or edit `.cursor/mcp.json` in your project or global Cursor settings:
```json
{
  "mcpServers": {
    "ikeen": {
      "url": "http://localhost:3001/mcp",
      "headers": {
        "Authorization": "Bearer ikn_live_<your_key>"
      }
    }
  }
}
```
Open Cursor Composer (`Cmd+I` or `Ctrl+I`) and ask:
> *"Search my iKeen notes for 'Meeting'* or *"Create a new note in iKeen titled 'Sprint Goals'"*

Cursor will call your local server, run the tool, and update your database in real time.

---

#### Option D: Automated Test Suite

To verify all endpoints, guards, and services programmatically:

```bash
bun run --filter=@repo/api test src/modules/mcp src/modules/auth/api-key src/modules/notes/notes-tool src/modules/folders/folders-tool
```