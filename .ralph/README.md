# Ralph Loop - Autonomous Development Workflow

## What is Ralph Loop?

Ralph Loop is a story-driven autonomous development workflow for Claude Code. It enables Claude to work through discrete development tasks ("stories") with clear acceptance criteria, tracking progress and capturing learnings along the way.

## Core Concepts

### Stories
A **story** is a discrete development task with:
- Clear context explaining the background
- Specific acceptance criteria (checkboxes)
- Constraints to follow (layer rules, testing requirements)
- A progress log updated as work proceeds

### The Loop
When Ralph Loop is active, Claude Code:
1. Reads the current story from `.ralph/current-story.md`
2. Works through acceptance criteria one by one
3. Runs tests and lint after each change
4. Logs progress to the story file
5. Marks criteria complete when verified
6. Continues until all criteria are met or blockers arise

### Progress Tracking
Each story maintains a progress log with:
- What was attempted
- What succeeded or failed
- Decisions made and their rationale
- Blockers encountered

### Learnings
After completing a story, key learnings are extracted and can be added to CLAUDE.md or layer rule files to improve future sessions.

## Directory Structure

```
.ralph/
├── README.md           # This file
├── config.json         # Loop configuration
├── STORY_TEMPLATE.md   # Template for new stories
├── current-story.md    # The active story (symlink or copy)
├── stories/            # Archive of all stories
│   └── *.md           # Individual story files
└── learnings/          # Captured learnings (optional)
```

## Usage

### Creating a New Story
1. Copy `STORY_TEMPLATE.md` to `stories/YYYY-MM-DD-story-name.md`
2. Fill in context, acceptance criteria, and constraints
3. Copy or symlink to `current-story.md`

### Running Ralph Loop
Use the `/ralph` command in Claude Code:
```
/ralph
```

Claude will read the current story and begin working through it autonomously.

### Monitoring Progress
- Check `current-story.md` for real-time progress updates
- The Progress Log section is appended to as work proceeds
- Criteria are checked off as they are completed

### Completing a Story
When all criteria are met:
1. The story is marked complete
2. Key learnings are extracted
3. The story can be moved to an archive

## Configuration

See `config.json` for settings:
- `maxTurnsPerStory`: Safety limit on iterations
- `requireTestsPass`: Must tests pass before marking criteria done?
- `requireLintPass`: Must lint pass before marking criteria done?
- `autoCommit`: Automatically commit after each criterion?
- `storyDirectory`: Where to store story files

## Best Practices

1. **Keep stories focused** - One clear objective per story
2. **Write testable criteria** - Each criterion should be verifiable
3. **Include constraints** - Reference layer rules and testing requirements
4. **Review progress logs** - They capture valuable context
5. **Extract learnings** - Update project documentation with insights

## Integration with StickerNest V5

Ralph Loop respects the StickerNest V5 architecture:
- Stories should specify which layer(s) they touch
- Constraints should reference the appropriate `.claude/rules/L*.md` files
- Progress logs should note any architectural decisions
- Tests must pass per the 80% coverage requirement
