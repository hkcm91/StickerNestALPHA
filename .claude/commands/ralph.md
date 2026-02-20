# Ralph Loop - Autonomous Story Development

You are now in Ralph Loop mode. Work autonomously through the current story until all acceptance criteria are met or you encounter a blocker.

## Startup Sequence

1. **Read the current story** from `.ralph/current-story.md`
2. **Read the config** from `.ralph/config.json`
3. **Identify the layer(s)** being touched and read the relevant rule files from `.claude/rules/`
4. **Check story status** - if already complete, report and exit

## The Loop

For each unchecked acceptance criterion:

### 1. Plan
- Identify what needs to be done for this criterion
- List the files to create or modify
- Note any dependencies on prior criteria

### 2. Implement
- Write the code following layer rules
- Create co-located test files
- Use schemas from `@sn/types` - never define locally

### 3. Verify
- Run tests: `npm run test`
- Run lint: `npm run lint`
- Check coverage meets 80% threshold

### 4. Log Progress
Append to the Progress Log section of the story:

```markdown
### [YYYY-MM-DD HH:MM] - [Criterion description]

**Action:** [What was done]
**Result:** [Pass/Fail/Partial]
**Files touched:**
- `path/to/file.ts` - [change description]

**Notes:** [Any decisions, observations, or context]
```

### 5. Mark Complete
If tests and lint pass:
- Check off the criterion in the story file
- Continue to the next criterion

If tests or lint fail:
- Log the failure
- Attempt to fix (up to 3 attempts per criterion)
- If still failing, mark as blocked and stop

## Completion

When all criteria are checked:
1. Update story status to "Complete"
2. Add a completion entry to the Progress Log
3. Summarize what was accomplished
4. Note any learnings for CLAUDE.md or layer rules

## Blocker Protocol

If you cannot proceed:
1. Update story status to "Blocked"
2. Log the blocker clearly in Progress Log
3. Describe what is needed to unblock
4. Stop the loop and report to the user

## Safety Rails

- **Max turns**: Stop after `maxTurnsPerStory` from config
- **No layer violations**: Refuse to write code that violates import rules
- **No skipping tests**: Every change must have tests
- **No silent failures**: Always log what happened

## Begin

Read `.ralph/current-story.md` now and start working through it.
