# Pipelines

Pipelines are visual connections between widgets. They let you wire one widget's output to another widget's input, creating interactive flows without writing code.

## What Are Pipelines?

A pipeline is a graph of connections: each widget has output ports (things it can send) and input ports (things it can receive). When you connect an output port to an input port, data flows from one widget to the other automatically.

For example: a button widget emits a "clicked" event → a pipeline edge carries it → a counter widget receives it and increments.

## Creating a Pipeline Connection

1. Switch to the **Pipeline tool** (press `W` or select it from the toolbar)
2. Hover over a widget to see its ports — small circles on the edges. Output ports appear on the right, input ports on the left.
3. Click and drag from an output port
4. Release on a compatible input port on another widget
5. The connection appears as a curved line between the two widgets

If the port types aren't compatible, you'll see a red indicator and the connection won't be created. Each input port accepts only one incoming connection. Each output port can fan out to multiple inputs.

## Built-in Transform Nodes

Pipelines support built-in transform nodes that process data between widgets:

- **Filter** — only pass events that match a condition
- **Map** — transform the event payload before passing it on
- **Merge** — combine events from multiple sources
- **Delay** — hold an event for a specified time before forwarding

To add a transform node, right-click on a pipeline edge and choose "Insert node."

## Viewing Pipelines

Pipeline connections are only visible in **edit mode**. In **preview mode**, they're hidden — the connections still work, but the visual wires disappear so users see a clean canvas.

## Editing and Deleting Connections

Click a pipeline edge to select it. Press Delete to remove the connection. You can also click the edge and drag either endpoint to rewire it.

To delete a transform node, select it and press Delete. The connection reverts to a direct link between the original source and target (if types are still compatible).

## Pipeline Validation

StickerNest validates your pipeline automatically:

- **No cycles**: you can't create a loop where Widget A feeds into Widget B which feeds back into Widget A. The system blocks this at connection time.
- **Type checking**: output and input ports must be type-compatible. Mismatches are rejected with a visual indicator.
- **Orphaned nodes**: nodes with no connections are allowed — they just don't do anything until you wire them up.

If validation detects an issue after you edit a pipeline, you'll see a warning indicator on the affected nodes.

## What's Next?

- [Working with widgets](widgets.md) — Widget installation and configuration
- [Canvas basics](canvas-basics.md) — Navigation and editing tools
- [Sharing and permissions](sharing.md) — Collaborating on canvases
