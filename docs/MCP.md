# Connect your AI to JojoPen

> Source: [jojopen.com/docs/mcp/](https://jojopen.com/docs/mcp/)

Let Claude, Codex, Cursor or any MCP client draw on your boards: diagrams, notes, slide decks, styling, sharing and export. Anything you can do with a board, your AI can do too.

You need a JojoPen account (sign in with Google and pick a username). Your AI signs in once with your approval; no password or key is shared with it.

---

## 1. Add JojoPen to your AI app

The server address is `https://jojopen.com/mcp`.

### Claude Code

Run once in your terminal, then type `/mcp` in Claude Code and pick **jojopen** to sign in:

```bash
claude mcp add --transport http jojopen https://jojopen.com/mcp
```

### Claude app (desktop and web)

**Settings → Connectors → Add custom connector**. Name it **JojoPen** and paste `https://jojopen.com/mcp`. Claude opens JojoPen to sign you in.

### Codex

Add this to `~/.codex/config.toml`, then run `codex mcp login jojopen`:

```toml
[mcp_servers.jojopen]
url = "https://jojopen.com/mcp"
```

### Cursor

Add this to `~/.cursor/mcp.json` (or your project's `.cursor/mcp.json`). Cursor asks you to sign in on first use:

```json
{
  "mcpServers": {
    "jojopen": {
      "url": "https://jojopen.com/mcp"
    }
  }
}
```

### Any other MCP client

Use Streamable HTTP at `https://jojopen.com/mcp` with OAuth 2.1. The client registers itself and opens the JojoPen sign-in page.

---

## 2. Approve it

JojoPen shows which app is asking and what it may do: **see your boards** and **create and change boards**. Untick the second to connect read-only. You can reconnect any time to change this.

---

## 3. Ask for something

```
Draw the architecture of a URL shortener on JojoPen and give me the link.
```

```
Turn my "checkout" board into a 5-slide deck I can present tomorrow.
```

```
Make the board public, switch it to chalkboard style and export a PNG.
```

> **Tip:** Your AI sees a picture of every change it makes, plus notes on what to fix (too many boxes, long labels, arrows pointing backwards), so it can tidy up before sharing the link.

---

## What your AI can do

| Area | Tools |
| :--- | :--- |
| **Boards** | `create_board`, `list_boards`, `get_board`, `rename_board`, `move_board`, `delete_board`, `set_visibility`, `list_collections`, `create_collection` |
| **Look** | `set_board_style`: sketch, clean or chalkboard; font; colours by meaning, random or black & white; light or dark; dots; snapping |
| **Diagrams** | `create_diagram`, `update_diagram` (whole diagram, or small edits like "add one box"), `get_diagram`, `validate_dsl`, `search_icons`, `clean_diagram`, `get_preview` |
| **Notes & drawing** | `add_sticky`, `add_text`, `draw_on_board` (shapes, arrows, icons, text) |
| **Slides** | `create_deck`, `design_slide` |
| **Export** | `export`: PNG, SVG, or a PDF of the slides |
| **Account** | `whoami` |

Boards your AI makes replay step by step in the app (the hourglass), in the order it drew them.

---

## Privacy and safety

- New boards are **private** until you (or your AI, when you ask) make them unlisted or public.
- Your AI only reaches **your** boards. Links to other people's boards are refused.
- Deleting a board needs an explicit confirmation from the AI, and AI apps ask you first.
- Each connection can make up to 120 calls a minute.
- If you have a board open while your AI changes it, the board updates in front of you. If you were editing at the same moment, JojoPen asks which version to keep.

---

## Troubleshooting

### New tools don't show up
AI apps remember the tool list from when they connected. Reconnect: in Claude Code, `/mcp` → `jojopen` → Reconnect; elsewhere, restart the app.

### "This connection is read-only"
It was approved without write access. Reconnect (Claude Code: `/mcp` → `jojopen` → Re-authenticate) and keep "Create and change boards" ticked.

### "Pick a username first"
Open [jojopen.com](https://jojopen.com/), sign in and choose a username; it becomes the first part of your board links.
