# Agent Teams — Master Reference Guide

> Guia de referência completo para construir e orquestrar Agent Teams no Claude Code.
> Baseado na documentação oficial: https://code.claude.com/docs/en/agent-teams

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Teams vs Subagents](#agent-teams-vs-subagents)
3. [Setup & Enable](#setup--enable)
4. [Architecture](#architecture)
5. [Starting a Team](#starting-a-team)
6. [Team Control](#team-control)
7. [Subagent Definitions (Reusable Roles)](#subagent-definitions-reusable-roles)
8. [Hooks for Quality Gates](#hooks-for-quality-gates)
9. [Best Practices](#best-practices)
10. [Use Case Patterns](#use-case-patterns)
11. [Troubleshooting](#troubleshooting)
12. [Limitations](#limitations)
13. [Quick Reference Cheat Sheet](#quick-reference-cheat-sheet)

---

## Overview

Agent Teams coordinate **multiple Claude Code instances** working together. One session acts as the **team lead**, coordinating work, assigning tasks, and synthesizing results. Teammates work **independently**, each in its own context window, and communicate directly with each other.

**Key difference from subagents**: teammates can message each other directly, not just report back to the caller.

**Requirements**: Claude Code v2.1.32+

---

## Agent Teams vs Subagents

| Aspect            | Subagents                                        | Agent Teams                                         |
|:------------------|:-------------------------------------------------|:----------------------------------------------------|
| **Context**       | Own context window; results return to caller     | Own context window; fully independent               |
| **Communication** | Report results back to main agent only           | Teammates message each other directly               |
| **Coordination**  | Main agent manages all work                      | Shared task list with self-coordination             |
| **Best for**      | Focused tasks where only the result matters      | Complex work requiring discussion and collaboration |
| **Token cost**    | Lower: results summarized back to main context   | Higher: each teammate is a separate Claude instance |

### When to use Agent Teams

- **Research and review**: multiple teammates investigate different aspects simultaneously
- **New modules or features**: teammates each own a separate piece without conflicts
- **Debugging with competing hypotheses**: test different theories in parallel
- **Cross-layer coordination**: frontend, backend, tests each owned by a different teammate

### When NOT to use Agent Teams

- Sequential tasks with dependencies
- Same-file edits (causes overwrites)
- Simple tasks where coordination overhead > benefit
- Routine tasks (single session is more cost-effective)

---

## Setup & Enable

Agent Teams are **disabled by default**. Enable via environment variable:

### Option 1: settings.json

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Option 2: Shell environment

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

---

## Architecture

An agent team consists of four components:

| Component     | Role                                                                       |
|:--------------|:---------------------------------------------------------------------------|
| **Team lead** | Main session that creates the team, spawns teammates, and coordinates work |
| **Teammates** | Separate Claude Code instances working on assigned tasks                   |
| **Task list** | Shared list of work items that teammates claim and complete                |
| **Mailbox**   | Messaging system for communication between agents                          |

### Storage locations

- **Team config**: `~/.claude/teams/{team-name}/config.json` (auto-generated, do NOT edit manually)
- **Task list**: `~/.claude/tasks/{team-name}/`

### Task states

Tasks have three states: **pending** → **in progress** → **completed**

Tasks can have **dependencies**: a pending task with unresolved dependencies cannot be claimed until those dependencies are completed. Dependencies unblock automatically when prerequisite tasks complete.

Task claiming uses **file locking** to prevent race conditions.

---

## Starting a Team

Tell Claude to create a team in natural language. Describe the task and team structure:

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Create an agent team to explore this from different angles: one
teammate on UX, one on technical architecture, one playing devil's advocate.
```

Claude will:
1. Create a team with a shared task list
2. Spawn teammates for each role
3. Have them explore the problem
4. Synthesize findings
5. Clean up the team when finished

### How teams get started

- **You request a team**: explicitly ask for an agent team
- **Claude proposes a team**: Claude suggests a team if it determines your task benefits from parallel work (you confirm first)

Claude **never** creates a team without your approval.

---

## Team Control

### Display Modes

| Mode           | Description                                         | Requirements          |
|:---------------|:----------------------------------------------------|:----------------------|
| **in-process** | All teammates run inside main terminal               | Any terminal          |
| **split panes**| Each teammate gets its own pane                      | tmux or iTerm2        |
| **auto**       | Split panes if in tmux, in-process otherwise (default)| -                    |

Configure in `~/.claude.json`:

```json
{
  "teammateMode": "in-process"
}
```

Or per-session:

```bash
claude --teammate-mode in-process
```

**In-process navigation:**
- `Shift+Down` — cycle through teammates
- `Enter` — view a teammate's session
- `Escape` — interrupt their current turn
- `Ctrl+T` — toggle the task list

### Specify Teammates and Models

```text
Create a team with 4 teammates to refactor these modules in parallel.
Use Sonnet for each teammate.
```

### Require Plan Approval

Force teammates to plan before implementing:

```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```

Flow: teammate plans → sends plan to lead → lead approves/rejects → if rejected, teammate revises → once approved, implementation begins.

Influence the lead's judgment:
- "Only approve plans that include test coverage"
- "Reject plans that modify the database schema"

### Talk to Teammates Directly

Each teammate is a full, independent Claude Code session. You can message any teammate directly.

- **In-process**: `Shift+Down` to cycle, then type
- **Split panes**: click into a teammate's pane

### Assign and Claim Tasks

- **Lead assigns**: tell the lead which task to give to which teammate
- **Self-claim**: after finishing a task, a teammate picks up the next unassigned, unblocked task

### Shut Down a Teammate

```text
Ask the researcher teammate to shut down
```

The teammate can approve (exits gracefully) or reject with an explanation.

### Clean Up the Team

```text
Clean up the team
```

**Important**: Always use the **lead** to clean up. Shut down all teammates first — cleanup fails if teammates are still running.

---

## Subagent Definitions (Reusable Roles)

You can define reusable roles as subagent `.md` files and reference them when spawning teammates:

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

### File format

```markdown
---
name: security-reviewer
description: Reviews code for security vulnerabilities
tools: Read, Glob, Grep, Bash
model: sonnet
---

You are a security reviewer. Analyze code for OWASP Top 10 vulnerabilities,
authentication flaws, and injection risks. Report findings with severity ratings.
```

### Subagent scopes (priority order)

| Location                     | Scope              | Priority    |
|:-----------------------------|:-------------------|:------------|
| Managed settings             | Organization-wide  | 1 (highest) |
| `--agents` CLI flag          | Current session    | 2           |
| `.claude/agents/`            | Current project    | 3           |
| `~/.claude/agents/`          | All your projects  | 4           |
| Plugin's `agents/` directory | Where plugin enabled| 5 (lowest) |

### All frontmatter fields

| Field             | Required | Description                                                              |
|:------------------|:---------|:-------------------------------------------------------------------------|
| `name`            | Yes      | Unique identifier (lowercase, hyphens)                                   |
| `description`     | Yes      | When Claude should delegate to this subagent                             |
| `tools`           | No       | Tools the subagent can use. Inherits all if omitted                      |
| `disallowedTools` | No       | Tools to deny (removed from inherited/specified list)                    |
| `model`           | No       | `sonnet`, `opus`, `haiku`, full model ID, or `inherit` (default)         |
| `permissionMode`  | No       | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns`        | No       | Maximum agentic turns before stopping                                    |
| `skills`          | No       | Skills to inject into context at startup                                 |
| `mcpServers`      | No       | MCP servers available (reference or inline definition)                   |
| `hooks`           | No       | Lifecycle hooks scoped to this subagent                                  |
| `memory`          | No       | Persistent memory scope: `user`, `project`, or `local`                   |
| `background`      | No       | `true` to always run as background task                                  |
| `effort`          | No       | `low`, `medium`, `high`, `max` (Opus 4.6 only)                          |
| `isolation`       | No       | `worktree` for isolated git worktree                                     |
| `color`           | No       | Display color: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `initialPrompt`   | No       | Auto-submitted as first user turn when running as main agent             |

### What applies when used as teammate

When a subagent definition runs as a teammate:
- **Honored**: `tools` allowlist and `model`
- **Appended**: the definition body is added to the teammate's system prompt (not replacing it)
- **Always available**: team tools (`SendMessage`, task management) regardless of `tools` restriction
- **NOT applied**: `skills` and `mcpServers` (teammates load these from project/user settings)

### CLI-defined subagents

```bash
claude --agents '{
  "code-reviewer": {
    "description": "Expert code reviewer. Use proactively after code changes.",
    "prompt": "You are a senior code reviewer. Focus on quality, security, and best practices.",
    "tools": ["Read", "Grep", "Glob", "Bash"],
    "model": "sonnet"
  }
}'
```

### Restrict which subagents can be spawned

In `tools` field:

```yaml
tools: Agent(worker, researcher), Read, Bash
```

Only `worker` and `researcher` can be spawned. Use `Agent` without parentheses for unrestricted.

### Disable specific subagents

In settings.json:

```json
{
  "permissions": {
    "deny": ["Agent(Explore)", "Agent(my-custom-agent)"]
  }
}
```

### Persistent memory

```yaml
memory: user    # ~/.claude/agent-memory/<name>/
memory: project # .claude/agent-memory/<name>/
memory: local   # .claude/agent-memory-local/<name>/
```

When enabled, the subagent gets instructions + Read/Write/Edit tools to manage its memory directory. The first 200 lines of `MEMORY.md` are loaded into context.

---

## Hooks for Quality Gates

### TeammateIdle

Runs when a teammate is about to go idle.

```json
{
  "hook_event_name": "TeammateIdle",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**Decision control:**
- **Exit code 2**: prevents idle (teammate continues working)
- **JSON `{"continue": false, "stopReason": "..."}`**: stops the teammate entirely

### TaskCreated

Runs when a task is being created.

```json
{
  "hook_event_name": "TaskCreated",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**Decision control:**
- **Exit code 2**: task is NOT created; stderr message fed back to model
- **JSON `{"continue": false, "stopReason": "..."}`**: stops the teammate

**Example — enforce naming convention:**

```bash
#!/bin/bash
INPUT=$(cat)
TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject')

if [[ ! "$TASK_SUBJECT" =~ ^\[TICKET-[0-9]+\] ]]; then
  echo "Task subject must start with a ticket number, e.g. '[TICKET-123] Add feature'" >&2
  exit 2
fi
exit 0
```

### TaskCompleted

Runs when a task is being marked as completed.

```json
{
  "hook_event_name": "TaskCompleted",
  "task_id": "task-001",
  "task_subject": "Implement user authentication",
  "task_description": "Add login and signup endpoints",
  "teammate_name": "implementer",
  "team_name": "my-project"
}
```

**Decision control:**
- **Exit code 2**: task is NOT marked complete; stderr fed back to model
- **JSON `{"continue": false, "stopReason": "..."}`**: stops the teammate

**Example — run tests before completion:**

```bash
#!/bin/bash
if ! npm test 2>&1; then
  echo "Tests not passing. Fix failing tests before completing task." >&2
  exit 2
fi
exit 0
```

### Subagent lifecycle hooks (settings.json)

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "db-agent",
        "hooks": [
          { "type": "command", "command": "./scripts/setup-db-connection.sh" }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          { "type": "command", "command": "./scripts/cleanup.sh" }
        ]
      }
    ]
  }
}
```

---

## Best Practices

### 1. Give teammates enough context

Teammates load project context (CLAUDE.md, MCP, skills) but NOT the lead's conversation history. Include task-specific details in the spawn prompt:

```text
Spawn a security reviewer teammate with the prompt: "Review the authentication module
at src/auth/ for security vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 2. Choose appropriate team size

- **Start with 3-5 teammates** for most workflows
- **5-6 tasks per teammate** keeps everyone productive
- Token costs scale linearly with teammates
- Three focused teammates often outperform five scattered ones

### 3. Size tasks appropriately

| Size      | Problem                                                |
|:----------|:-------------------------------------------------------|
| Too small | Coordination overhead exceeds benefit                  |
| Too large | Teammates work too long without check-ins              |
| Just right| Self-contained units with clear deliverable (function, test file, review) |

### 4. Avoid file conflicts

Break work so **each teammate owns a different set of files**. Two teammates editing the same file leads to overwrites.

### 5. Wait for teammates to finish

If the lead starts implementing instead of delegating:

```text
Wait for your teammates to complete their tasks before proceeding
```

### 6. Start with research and review

If new to agent teams, start with tasks that don't require writing code: reviewing a PR, researching a library, investigating a bug.

### 7. Monitor and steer

Check in on progress, redirect approaches that aren't working, synthesize findings as they come in. Don't let teams run unattended too long.

### 8. Pre-approve common operations

Add common tool permissions to settings before spawning teammates to reduce permission prompt friction.

---

## Use Case Patterns

### Pattern 1: Parallel Code Review

```text
Create an agent team to review PR #142. Spawn three reviewers:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

**Why it works**: each reviewer applies a different filter, preventing the single-reviewer bias of gravitating toward one type of issue.

### Pattern 2: Competing Hypotheses Debugging

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

**Why it works**: adversarial structure fights anchoring bias. The theory that survives debate is more likely to be correct.

### Pattern 3: Cross-Layer Feature Implementation

```text
Create an agent team to implement the new notifications feature:
- Teammate 1: Backend API endpoints and database schema
- Teammate 2: Frontend components and state management
- Teammate 3: Integration tests and E2E tests
Each teammate owns their layer. Coordinate on the API contract first.
```

### Pattern 4: Research & Analysis

```text
Create an agent team to evaluate migration options from Express to Fastify:
- Teammate 1: Benchmark performance differences
- Teammate 2: Audit our middleware compatibility
- Teammate 3: Research ecosystem/plugin availability
Synthesize findings into a recommendation document.
```

### Pattern 5: Refactoring with Plan Approval

```text
Create an agent team to refactor the payment module into smaller services.
Require plan approval for each teammate before they make changes.
Only approve plans that include test coverage and don't break existing APIs.
- Teammate 1: Extract billing logic
- Teammate 2: Extract invoice generation
- Teammate 3: Extract payment gateway integration
```

---

## Troubleshooting

| Problem                        | Solution                                                       |
|:-------------------------------|:---------------------------------------------------------------|
| Teammates not appearing        | Press `Shift+Down` to cycle; check task complexity; verify tmux |
| Too many permission prompts    | Pre-approve common operations in permission settings           |
| Teammates stopping on errors   | Check output via `Shift+Down`, give additional instructions    |
| Lead shuts down early          | Tell lead to wait for teammates to finish                      |
| Orphaned tmux sessions         | `tmux ls` then `tmux kill-session -t <session-name>`           |
| Task status lagging            | Check if work is done, manually update or nudge teammate       |

---

## Limitations

- **No session resumption**: `/resume` and `/rewind` don't restore in-process teammates
- **Task status can lag**: teammates sometimes fail to mark tasks as completed
- **Shutdown can be slow**: teammates finish current request before shutting down
- **One team per session**: clean up current team before starting a new one
- **No nested teams**: teammates cannot spawn their own teams
- **Lead is fixed**: cannot promote a teammate to lead
- **Permissions set at spawn**: all teammates start with lead's permission mode
- **Split panes require tmux/iTerm2**: not supported in VS Code terminal, Windows Terminal, or Ghostty

---

## Quick Reference Cheat Sheet

### Enable

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

### Create a team

```text
Create an agent team with 3 teammates to [describe task]
```

### Navigate teammates (in-process)

| Key           | Action                    |
|:--------------|:--------------------------|
| `Shift+Down`  | Cycle through teammates   |
| `Enter`       | View teammate session     |
| `Escape`      | Interrupt teammate turn   |
| `Ctrl+T`      | Toggle task list          |

### Common commands to the lead

```text
# Specify team structure
Create a team with 4 teammates using Sonnet for each

# Require planning
Require plan approval before they make any changes

# Wait for completion
Wait for your teammates to complete their tasks before proceeding

# Shut down a teammate
Ask the researcher teammate to shut down

# Clean up
Clean up the team
```

### Subagent file template

```markdown
---
name: my-agent
description: When to use this agent
tools: Read, Glob, Grep, Bash
model: sonnet
memory: project
color: blue
---

You are a [role]. Your job is to [task].
[Specific instructions and constraints]
```

### Hook template (settings.json)

```json
{
  "hooks": {
    "TaskCompleted": [{
      "hooks": [{
        "type": "command",
        "command": "./scripts/validate-task.sh"
      }]
    }]
  }
}
```

---

*Last updated: 2026-04-05 | Source: https://code.claude.com/docs/en/agent-teams*
