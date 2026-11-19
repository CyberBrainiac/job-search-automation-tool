# Claude Code setup guide

How to give Claude Code the extra tools it uses in this repository, on a new Windows PC. Install the project
itself first: Node.js 22+, pnpm 10 and `pnpm install` (see `README.md`).

When everything is set up you will have:

| Tool                  | What Claude uses it for                                                                             | Installed where                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| TypeScript LSP plugin | Type errors right after each edit, "find references" and "go to definition" across the apps         | Language server: machine. Plugin: this project only (`.claude/settings.local.json`) |
| ast-grep              | Search and rewrite TypeScript by syntax, not by text lines (replaces `grep -r` + `sed -i`)          | Machine (npm global)                                                                |
| jq                    | Read and edit JSON: `package.json`, `tsconfig.json`, API responses (replaces inline Python scripts) | Machine (winget)                                                                    |

Nothing in this guide changes committed files. Your personal settings live in `.claude/settings.local.json`
(in `.gitignore`) and in your Windows profile.

The committed file `.claude/launch.json` lets Claude start the back app (port 3000) and the front app (port 3001)
for a preview in the desktop app. It needs no setup.

---

## 0. Before you start

- Windows 11 with PowerShell 7, Git for Windows, Node.js 22+ and pnpm 10.
- The `claude` command-line tool: `winget install Anthropic.ClaudeCode`.
- The repository is cloned and `pnpm install` ran.

**Run the commands in this guide in your own terminal.** The Claude desktop app is a packaged Windows (MSIX) app,
and Claude's Bash tool runs inside that package. When a command started from the Bash tool creates a new folder
under `%APPDATA%` (for example the folder for global npm packages), Windows puts the folder in the app's private
store, `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\`. The command reports success, but the real disk does
not get the folder, and from then on the Bash tool sees only the private copy. Writes into folders that already
exist on the real disk are not redirected. Claude's PowerShell tool and the Terminal panel run outside the package.
If you ask Claude to do this setup, tell it to use the PowerShell tool or the Terminal panel, and to check the
result from a real terminal (step 3).

## 1. Install the command-line tools

Skip a tool that is already installed (step 3 shows how to check). They are machine-wide, so one install serves
all your projects.

```powershell
npm install -g typescript-language-server typescript@6 @ast-grep/cli
```

- Install `typescript@6`, not the latest version. TypeScript 7 (the native version) has no `tsserver`, which
  `typescript-language-server` needs. Inside this repository the server uses the TypeScript of each app from
  `node_modules`; the global one is the fallback for files outside it.
- npm 11 warns that the `@ast-grep/cli` postinstall script did not run. You can ignore this; ast-grep works without it.

```powershell
winget install --id jqlang.jq -e --source winget
```

## 2. Enable the TypeScript LSP plugin for this project

From the repository root:

```powershell
claude plugin install typescript-lsp@claude-plugins-official --scope local
```

This writes `enabledPlugins` into `.claude/settings.local.json`. `.gitignore` keeps that file out of git. After
this step the file is:

```json
{
  "enabledPlugins": {
    "typescript-lsp@claude-plugins-official": true
  }
}
```

## 3. Restart and check

Restart Claude Code. The new PATH and the plugin load only when it starts. Then open a **new** terminal and check:

| Command                                       | Expected output                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `typescript-language-server --version`        | `6.x` or newer                                                              |
| `tsc --version`                               | `Version 6.x` (the global fallback)                                         |
| `ast-grep --version`                          | `ast-grep 0.x`                                                              |
| `jq --version`                                | `jq-1.8.x`                                                                  |
| `claude plugin list` (in the repository root) | `typescript-lsp@claude-plugins-official`, `Scope: local`, `Status: enabled` |

## 4. How Claude uses the tools

These are notes for Claude as much as for you. To make Claude remember them on a new PC, ask it to read this
section and save it to memory.

**ast-grep** (TypeScript structure, not text):

- Find calls, including calls split over several lines:
  `ast-grep run -l ts -p '$S.getHello()' apps/back/src`
- Rename a field everywhere it is used as a property: `ast-grep run -l ts -p '$OBJ.oldName' -r '$OBJ.newName' apps`
  shows a diff only; add `-U` to apply it. Strings and comments are not touched.
- Use `-l tsx` for React files of the front app.
- Use it in place of `sed -i` on `.ts` and `.tsx` files. `sed` works line by line and breaks on multi-line code and
  escaping.

**jq** (JSON):

- The Windows `jq.exe` writes CRLF line endings. `-b` makes it write LF.
- This repository checks out every text file with LF (`.gitattributes`: `* text=auto eol=lf`). So always pass `-b`
  when jq writes a file. `git ls-files --eol <file>` shows `w/lf` for each file.
- Pass the indent of the file: `--indent 2` for `package.json` and the `tsconfig` files. With `-b` and the right
  indent, `jq -b --indent 2 . file.json` returns the file byte for byte, so a jq edit changes only the keys you touch.
- Write the result to a temporary file, then move it over the original. Do not pipe jq into a command that can stop
  reading early (for example `cmp -s`); jq then fails with `writing output failed: Invalid argument`.
- When the shell reads jq's output (keys, values, counts), pass `-b`, so that no line ends with a stray CR.

**TypeScript LSP**: no commands. Claude gets diagnostics after each edit and can ask for definitions and
references. The first request after a start can return only the declaration: repeat it.

## 5. Troubleshooting

| Symptom                                                                                                                                                                  | Fix                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude says `ast-grep` or `jq` is not found                                                                                                                              | Restart Claude Code; PATH loads only at start.                                                                                                                                                                                                                                                    |
| A tool or file works in Claude's Bash tool but is missing in your terminal, or the Bash tool and the PowerShell tool show different content for a file under `%APPDATA%` | The Bash tool created the folder in the app's private store (§0). Run the step again in your own terminal. Then move the old copy (for example `npm`) out of `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\`, so that the Bash tool sees the real folder again. Move it, do not delete it. |
| No type errors or references from the LSP plugin                                                                                                                         | Check that `typescript-language-server --version` works and that the global TypeScript is 6 (`tsc --version`), then restart Claude Code.                                                                                                                                                          |
| `claude plugin list` shows the plugin as disabled                                                                                                                        | Run step 2 again in the repository root. The local scope belongs to one folder.                                                                                                                                                                                                                   |
| Every line of a jq-edited file shows as changed                                                                                                                          | jq wrote CRLF. Run jq again with `-b` (§4).                                                                                                                                                                                                                                                       |
