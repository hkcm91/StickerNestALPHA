# StickerNest V5 — UI Components Needed

> **Purpose**: This document catalogs all backend functionality that has been implemented but requires front-facing UI components. Use this as a roadmap for UI development.
>
> **Last Updated**: 2026-02-23

---

## Overview

| Layer | Features Needing UI | Priority |
|-------|---------------------|----------|
| L0: Kernel | 9 | Critical |
| L1: Social | 12 | High |
| L2: Lab | 10 | High |
| L3: Runtime | 3 | Medium |
| L4A: Canvas | 17 | Critical |
| L4B: Spatial | 3 | Low |
| L5: Marketplace | 6 | High |
| L6: Shell | 4 | Critical |

**Total Features Requiring UI**: ~64

---

## Layer 0: Kernel (Critical Foundation UI)

### 1. Auth System
**Backend**: `src/kernel/auth/`

| Component | Description |
|-----------|-------------|
| Login Form | Email/password fields, submit, forgot password link |
| Signup Form | Email/password/confirm fields, terms checkbox |
| OAuth Buttons | Google, GitHub provider buttons |
| Password Reset | Email input → reset link flow |
| Session Manager | Active sessions list, logout all devices |
| Tier Badge | Display user tier (Free/Creator/Pro/Enterprise) |

---

### 2. Workspace Management
**Backend**: `src/kernel/stores/workspace/`

| Component | Description |
|-----------|-------------|
| Workspace Switcher | Dropdown listing all user workspaces |
| Workspace Settings Panel | Name, description, default role config |
| Member List | Table with role dropdowns, invite/remove actions |
| Invite Dialog | Email input, role selector, send invite |
| Workspace Delete Confirmation | Two-step deletion with workspace name confirmation |

---

### 3. DataSource Management
**Backend**: `src/kernel/datasource/`

| Component | Description |
|-----------|-------------|
| DataSource Browser | Tree/list view of all accessible DataSources |
| DataSource Detail View | Schema display, metadata, revision history |
| ACL Management Panel | User list with role dropdowns (owner/editor/commenter/viewer) |
| DataSource Creation Wizard | Type selector, scope picker, schema builder |
| Conflict Toast | "Row changed — refreshed" non-blocking notification |

---

### 4. Event Bus (Dev Tools Only)
**Backend**: `src/kernel/bus/`

| Component | Description |
|-----------|-------------|
| Event Inspector | Real-time event log with type/payload/direction columns |
| Event Filter | Namespace dropdown filter (kernel.*, social.*, widget.*, etc.) |
| Event Replay | Replay events from ring buffer history |
| Clear Log Button | Reset inspector view |

---

### 5. Canvas Management
**Backend**: `src/kernel/stores/canvas/`

| Component | Description |
|-----------|-------------|
| Canvas Browser | Grid/list of user's canvases with thumbnails |
| Canvas Properties Panel | Name, description, thumbnail editor |
| Sharing Dialog | Public/private toggle, shareable link generator, user access list |
| Canvas Delete Confirmation | Deletion with data loss warning |

---

### 6. Widget Management
**Backend**: `src/kernel/stores/widget/`

| Component | Description |
|-----------|-------------|
| Widget Registry Browser | All installed widgets with icons |
| Widget Config Panel | Dynamic form from manifest config schema |
| Widget Instance State Viewer | Debug view of instance state (dev mode) |

---

### 7. History (Undo/Redo)
**Backend**: `src/kernel/stores/history/`

| Component | Description |
|-----------|-------------|
| Undo Button | Toolbar icon, Cmd/Ctrl+Z shortcut |
| Redo Button | Toolbar icon, Cmd/Ctrl+Shift+Z shortcut |
| History Panel | Operation stack list with timestamps (optional) |

---

### 8. UI State
**Backend**: `src/kernel/stores/ui/`

| Component | Description |
|-----------|-------------|
| Mode Toggle | Edit ↔ Preview button in toolbar |
| Theme Selector | Light/Dark/High-Contrast dropdown |
| Sidebar Toggles | Left/right sidebar visibility buttons |
| Toast Container | Notification stack in corner of screen |
| Loading Overlay | Global loading spinner |

---

### 9. Social Presence
**Backend**: `src/kernel/stores/social/`

| Component | Description |
|-----------|-------------|
| Presence Avatars | Avatar pills showing online users |
| Remote Cursors | SVG cursors with user colors and labels |
| Online Count Badge | "3 online" indicator |
| Presence Tooltip | User names and join times on hover |

---

## Layer 1: Social & Collaboration (High Priority)

### 10. Presence Tracking
**Backend**: `src/social/presence/`

| Component | Description |
|-----------|-------------|
| Join Toast | "User X joined the canvas" notification |
| Leave Toast | "User X left the canvas" notification |
| Guest Indicator | "Guest" label with random color |

---

### 11. Cursor Broadcasting
**Backend**: `src/social/cursor/`

| Component | Description |
|-----------|-------------|
| Remote Cursor Renderer | SVG cursors positioned on canvas |
| Cursor Labels | Usernames floating near cursors |
| Cursor Fade | Fade out on inactivity/disconnect |

---

### 12. Entity Sync
**Backend**: `src/social/entity-sync/`

| Component | Description |
|-----------|-------------|
| Drag Shadow | Ghost/shadow of entity during remote user drag |
| Permission Denied Indicator | Red overlay when attempting unauthorized edit |

---

### 13. Edit Locks
**Backend**: `src/social/edit-lock/`

| Component | Description |
|-----------|-------------|
| Lock Indicator | Colored border with locker's avatar |
| Lock Tooltip | "Locked by User X since 12s" on hover |
| Lock Timeout Warning | "Your lock expires in 10s" toast |
| Unlock Button | Manual unlock for lock owner |

---

### 14. Offline Mode
**Backend**: `src/social/offline/`

| Component | Description |
|-----------|-------------|
| Connection Status Indicator | Green/yellow/red dot in header |
| Offline Banner | "You're offline. Changes sync when online." |
| Sync Queue Status | Pending edit count during offline |

---

### 15. User Profiles
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Profile Setup Wizard | Username, display name, bio, avatar, visibility |
| Profile Page | Full profile view with all fields |
| Profile Edit Form | Inline editing of profile fields |
| Avatar Upload | Image cropper and upload |

---

### 16. Follow System
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Follow Button | Follow/Unfollow/Pending states |
| Followers List | Paginated list with unfollow buttons |
| Following List | Paginated list with unfollow buttons |
| Follow Requests Panel | Accept/reject pending requests |

---

### 17. Posts & Feed
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Post Composer | Text input, rich formatting, media attach, visibility |
| Post Card | Author, content, timestamp, action buttons |
| Home Feed | Following users' posts |
| Explore Feed | All public posts |
| Post Detail Page | Full post with reply thread |

---

### 18. Reactions
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Reaction Bar | Emoji buttons (like, love, laugh, etc.) |
| Reaction Count | Number display per reaction type |
| Reaction Viewer | Who reacted modal |

---

### 19. Comments
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Comment Display | Author, text, timestamp, actions |
| Reply Input | Text field with post/cancel buttons |
| Nested Replies | Indented thread with collapse/expand |
| Load More Replies | "Load 5 more replies" button |

---

### 20. Notifications
**Backend**: `src/kernel/schemas/social-graph.ts`

| Component | Description |
|-----------|-------------|
| Notification Bell | Icon with unread count badge |
| Notification Dropdown | Recent notifications list |
| Notification Item | Icon, message, timestamp, click to navigate |
| Mark All Read | Button in dropdown header |
| Notification Settings | Toggle types, frequency selector |

---

### 21. Integration Management
**Backend**: `src/runtime/integrations/`

| Component | Description |
|-----------|-------------|
| Connected Integrations List | Notion, Sheets, etc. with status |
| OAuth Connect Button | Per-provider connect buttons |
| Disconnect/Revoke Button | Remove integration access |
| Token Expiry Warning | "Reconnect required" indicator |
| Permission Grant Dialog | "Widget X requests access to Notion" |
| Resource Selector | Which databases/sheets to grant |
| Integration Usage Dashboard | API call history, rate limits |

---

## Layer 2: Widget Lab (High Priority)

### 22. Widget Editor
**Backend**: `src/lab/editor/`

| Component | Description |
|-----------|-------------|
| Monaco Editor Pane | Code editor with HTML/JS/CSS support |
| File Tabs | Tab bar for open files |
| Unsaved Indicator | Dot on tab when modified |
| Save Button | Manual save with Cmd/Ctrl+S shortcut |
| Error Console | Syntax/validation errors below editor |

---

### 23. Live Preview
**Backend**: `src/lab/preview/`

| Component | Description |
|-----------|-------------|
| Preview Pane | Sandboxed widget render |
| Preview Mode Selector | 2D Isolated / 2D Canvas / 3D dropdown |
| Reload Button | Force preview refresh |
| Preview Error Display | Error boundary message |

---

### 24. Event Inspector
**Backend**: `src/lab/inspector/`

| Component | Description |
|-----------|-------------|
| Inspector Panel | Event log table |
| Event Type Filter | Dropdown/checkbox filter |
| Payload Viewer | Pretty-printed JSON |
| Clear Log Button | Reset inspector |
| Auto-Scroll Toggle | Follow new events checkbox |

---

### 25. Manifest Editor
**Backend**: `src/lab/manifest/`

| Component | Description |
|-----------|-------------|
| Manifest Form | Name, version, permissions fields |
| Event Contract Editor | Add/remove event types |
| Config Schema Editor | Add/edit config fields with types |
| Breaking Change Warning | Modal on incompatible changes |
| JSON View Toggle | Switch between form and raw JSON |

---

### 26. AI Generation
**Backend**: `src/lab/ai/`

| Component | Description |
|-----------|-------------|
| AI Panel | Sidebar or modal |
| Prompt Input | Textarea for widget description |
| Generate Button | Trigger AI generation |
| Status Indicator | Spinner during generation |
| Error Display | Validation failure messages |

---

### 27. Version History
**Backend**: `src/lab/versions/`

| Component | Description |
|-----------|-------------|
| Versions Panel | List of saved snapshots |
| Snapshot Row | Timestamp, label, restore/delete actions |
| Restore Confirmation | "This will overwrite current changes" dialog |
| Save Snapshot Button | Create new snapshot with optional label |

---

### 28. Widget Import
**Backend**: `src/lab/import/`

| Component | Description |
|-----------|-------------|
| Import Dialog | Search Marketplace widgets |
| License Display | License badge and terms |
| Import Button | "Import to Lab" action |
| Fork Indicator | "Forked from Widget X" badge |

---

### 29. Node Graph Editor
**Backend**: `src/lab/graph/`

| Component | Description |
|-----------|-------------|
| Graph Canvas | Node layout area with pan/zoom |
| Node Component | Draggable node with ports |
| Edge Drawing | Drag from output to input port |
| Node Creation Menu | Right-click or button to add nodes |
| Node Inspector | Property editor for selected node |
| Compile Button | Generate HTML from graph |

---

### 30. Publish Pipeline
**Backend**: `src/lab/publish/`

| Component | Description |
|-----------|-------------|
| Publish Dialog | Multi-step wizard |
| Step Indicator | Validate → Test → Screenshot → Submit |
| Step Status | Pass/fail icon per step |
| Error Messages | Specific failure guidance |
| Success Confirmation | Link to Marketplace listing |

---

### 31. Lab Access Gate
**Route Level**

| Component | Description |
|-----------|-------------|
| Creator Upgrade Prompt | "Upgrade to Creator tier to access Widget Lab" |
| Mobile Redirect | "Widget Lab requires a desktop browser" |

---

## Layer 3: Runtime (Medium Priority)

### 32. Built-in Widget Library
**Backend**: `src/runtime/widgets/`

| Component | Description |
|-----------|-------------|
| Built-in Badge | "Built-in" tag in asset panel |
| Quick-Add Buttons | Sticky Note, Clock, Counter shortcuts |

---

### 33. Widget Crash Handling
**Backend**: `src/runtime/WidgetFrame.tsx`

| Component | Description |
|-----------|-------------|
| Widget Error State | "Widget crashed" message with reload option |
| Error Details (Dev) | Stack trace in development mode |

---

### 34. Theme Token Display (Dev)
**Backend**: `src/runtime/sdk/`

| Component | Description |
|-----------|-------------|
| Theme Token Inspector | Debug panel showing injected tokens |

---

## Layer 4A: Canvas (Critical Priority)

### 35. Viewport Controls
**Backend**: `src/canvas/core/viewport/`

| Component | Description |
|-----------|-------------|
| Zoom Slider | -90% to +200% range |
| Zoom Percentage Display | "100%" indicator |
| Zoom to Fit Button | Fit all entities in view |
| Reset View Button | Return to (0,0) at 100% |
| Mini-Map (Optional) | Navigator showing viewport position |

---

### 36. Tool Toolbar
**Backend**: `src/canvas/tools/`

| Component | Description |
|-----------|-------------|
| Tool Buttons | Select, Move, Pen, Text, Shapes, etc. |
| Active Tool Highlight | Border/background on active tool |
| Tool Tooltips | Name + keyboard shortcut on hover |

---

### 37. Select Tool UI
**Backend**: `src/canvas/tools/select/`

| Component | Description |
|-----------|-------------|
| Selection Border | Blue border around selected entities |
| Multi-Select Count | "3 selected" badge |
| Marquee Box | Dashed rectangle during region select |

---

### 38. Move Tool UI
**Backend**: `src/canvas/tools/move/`

| Component | Description |
|-----------|-------------|
| Snap-to-Grid Toggle | Button/checkbox in toolbar |
| Alignment Guides | Green lines when aligned with other entities |
| Grid Settings | Grid size slider in canvas settings |

---

### 39. Resize Tool UI
**Backend**: `src/canvas/tools/resize/`

| Component | Description |
|-----------|-------------|
| Resize Handles | 8 draggable handles (corners + edges) |
| Aspect Ratio Lock Toggle | Button in properties panel |
| Size Display | Dimensions tooltip during resize |

---

### 40. Pen Tool Options
**Backend**: `src/canvas/tools/pen/`

| Component | Description |
|-----------|-------------|
| Color Picker | Stroke color selector |
| Brush Size Slider | Thickness control |
| Opacity Slider | Transparency control |
| Eraser Toggle | Switch to erase mode |

---

### 41. Text Tool Options
**Backend**: `src/canvas/tools/text/`

| Component | Description |
|-----------|-------------|
| Font Picker | Font family dropdown |
| Font Size Selector | Size input/dropdown |
| Text Color Picker | Color selector |
| Format Buttons | Bold, Italic, Underline toggles |
| Alignment Buttons | Left, Center, Right, Justify |

---

### 42. Shape Tool Options
**Backend**: `src/canvas/tools/shape/`

| Component | Description |
|-----------|-------------|
| Fill Color Picker | Fill color selector |
| Stroke Color Picker | Border color selector |
| Stroke Width Slider | Border thickness |
| Corner Radius Slider | Rectangle corners (rect only) |

---

### 43. Pipeline Graph Editor
**Backend**: `src/canvas/wiring/`

| Component | Description |
|-----------|-------------|
| Pipeline Canvas | Visual graph editing area |
| Widget Nodes | Nodes representing widget instances |
| Transform Nodes | Filter, Map, Merge, Delay nodes |
| Edge Lines | Curved/orthogonal edge routing |
| Port Hover | Highlight compatible ports |
| Type Mismatch Indicator | Red X on incompatible connection |
| Delete Node/Edge | Right-click or keyboard delete |

---

### 44. Pipeline Inspector
**Backend**: `src/canvas/wiring/`

| Component | Description |
|-----------|-------------|
| Node List | Table of all nodes with types |
| Edge List | Source → Target port connections |
| Validation Errors | Cycle detection, type mismatches |
| Execution Monitor | Real-time event flow (dev mode) |

---

### 45. Properties Panel
**Backend**: `src/canvas/panels/properties/`

| Component | Description |
|-----------|-------------|
| Position Fields | X, Y inputs |
| Size Fields | Width, Height inputs |
| Rotation Slider | Angle control |
| Widget Config Form | Dynamic fields from manifest |
| Advanced Section | Collapsible advanced properties |
| Multi-Select View | "Mixed" indicator for differing values |

---

### 46. Layers Panel
**Backend**: `src/canvas/panels/layers/`

| Component | Description |
|-----------|-------------|
| Entity List | Rows in z-order (top = front) |
| Visibility Toggle | Eye icon per row |
| Drag Handle | Reorder z-order by dragging |
| Entity Icon | Type-specific icon |
| Entity Name | Label with inline rename on double-click |
| Context Menu | Right-click options |

---

### 47. Asset Panel
**Backend**: `src/canvas/panels/asset/`

| Component | Description |
|-----------|-------------|
| Tab Bar | Stickers / Widgets / Media tabs |
| Search Box | Filter assets by name |
| Thumbnail Grid | Asset previews |
| Drag to Canvas | Drag asset onto canvas |
| Upload Button | Add custom stickers/media |
| Category Filter | Sidebar or dropdown |

---

### 48. Context Menu
**Backend**: `src/canvas/panels/context-menu/`

| Component | Description |
|-----------|-------------|
| Menu Container | Positioned at right-click point |
| Menu Items | Duplicate, Delete, Bring to Front, Send to Back, etc. |
| Keyboard Shortcuts | Displayed inline (e.g., "Delete ⌫") |

---

### 49. Floating Action Bar
**Backend**: `src/canvas/panels/floating-bar/`

| Component | Description |
|-----------|-------------|
| Bar Container | Positioned near selection |
| Quick Actions | Delete, Duplicate, Edit buttons |
| More Menu | Overflow actions |

---

### 50. Mode Toggle
**Route/Store Level**

| Component | Description |
|-----------|-------------|
| Edit/Preview Toggle | Button or dropdown in toolbar |
| Mode Indicator | Visual distinction between modes |
| Preview Mode Panels Hidden | Automatic panel visibility change |

---

## Layer 4B: Spatial/VR (Low Priority)

### 51. VR Entry
**Backend**: `src/spatial/`

| Component | Description |
|-----------|-------------|
| Enter VR Button | Prominent button if WebXR supported |
| Unsupported Message | "VR not available on this device" |
| Permission Denied Error | User-friendly error handling |

---

### 52. VR Session UI
**Backend**: `src/spatial/`

| Component | Description |
|-----------|-------------|
| Exit VR Button | In-headset exit control |
| Controller Visualization | Ray + intersection point |
| Grab Feedback | Visual feedback on grip press |

---

### 53. Spatial Position Editor
**Backend**: `src/spatial/`

| Component | Description |
|-----------|-------------|
| 3D Position Fields | X, Y, Z inputs |
| Rotation Display | Quaternion or Euler angles |
| "Place in VR" Button | Open VR to position entity |

---

## Layer 5: Marketplace (High Priority)

### 54. Browse Page
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| Search Bar | Full-text search input |
| Category Sidebar | Filter by category |
| Sort Dropdown | Downloads, Rating, Newest |
| Widget Grid | Card layout with thumbnails |
| Featured Carousel | Curated widgets slider |
| Pagination | Page controls or infinite scroll |

---

### 55. Widget Detail Page
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| Screenshot Gallery | Image carousel |
| Widget Info | Name, author, version, rating |
| Description | Long-form markdown content |
| Install Button | Primary action button |
| License Badge | MIT, Proprietary, etc. |
| Permissions List | Required permissions from manifest |
| Similar Widgets | Recommendation row |

---

### 56. Installation Flow
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| Install Confirmation | Permissions review dialog |
| Progress Indicator | Download/validate spinner |
| Success Toast | "Widget installed!" with quick-add option |

---

### 57. Uninstall Flow
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| Uninstall Confirmation | "This will delete all saved data" warning |
| Confirm/Cancel Buttons | User confirmation |
| Success Toast | "Widget uninstalled" notification |

---

### 58. Publisher Dashboard
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| My Widgets List | Published widgets with stats |
| Widget Card Actions | Edit, Update, Deprecate, Delete |
| Analytics View (Optional) | Install count, ratings over time |
| Publish Wizard | Final step of Lab pipeline |

---

### 59. Reviews Section
**Backend**: `src/marketplace/`

| Component | Description |
|-----------|-------------|
| Rating Summary | Stars + count |
| Write Review Button | Opens review form |
| Review List | Paginated reviews |
| Review Card | Stars, text, author, timestamp |
| Helpful Button | Upvote review |
| Delete Button | For review author |

---

## Layer 6: Shell (Critical Priority)

### 60. Application Layout
**Backend**: `src/shell/`

| Component | Description |
|-----------|-------------|
| Header Bar | Logo, navigation, user menu |
| Left Sidebar Slot | Panel mount point |
| Right Sidebar Slot | Panel mount point |
| Main Content Area | Page/canvas viewport |
| Bottom Bar (Optional) | Status indicators |

---

### 61. Theme Selector
**Backend**: `src/shell/`

| Component | Description |
|-----------|-------------|
| Theme Dropdown | Light / Dark / High-Contrast |
| Theme Preview | Instant preview on hover |
| Custom Theme Editor (Optional) | Token overrides |

---

### 62. Global Shortcuts Help
**Backend**: `src/shell/`

| Component | Description |
|-----------|-------------|
| Shortcuts Dialog | List of all keyboard shortcuts |
| Shortcut Categories | Canvas, Lab, Global sections |
| Open via ? key | Standard help shortcut |

---

### 63. Error Boundary UI
**Backend**: `src/shell/`

| Component | Description |
|-----------|-------------|
| Error Page | "Something went wrong" message |
| Reload Button | Refresh the application |
| Error Details | Stack trace in dev mode |
| Report Bug Link (Optional) | Send error report |

---

### 64. Route Transitions
**Backend**: `src/shell/`

| Component | Description |
|-----------|-------------|
| Loading State | Route-level loading indicator |
| Page Transitions | Smooth transitions between routes |

---

## Priority Implementation Order

### Phase 1: Core Shell & Auth (Week 1-2)
1. Application Layout (L6)
2. Login/Signup Forms (L0)
3. Workspace Switcher (L0)
4. Theme Selector (L6)
5. Error Boundary (L6)

### Phase 2: Canvas Foundation (Week 3-4)
6. Viewport Controls (L4A)
7. Tool Toolbar (L4A)
8. Selection UI (L4A)
9. Mode Toggle (L4A)
10. Presence Indicators (L0/L1)

### Phase 3: Canvas Editing (Week 5-6)
11. Properties Panel (L4A)
12. Layers Panel (L4A)
13. Asset Panel (L4A)
14. Context Menu (L4A)
15. Sharing Dialog (L0)

### Phase 4: Canvas Tools (Week 7-8)
16. Move/Resize Handles (L4A)
17. Pen Tool Options (L4A)
18. Text Tool Options (L4A)
19. Shape Tool Options (L4A)

### Phase 5: Collaboration (Week 9-10)
20. Remote Cursors (L1)
21. Edit Lock Indicators (L1)
22. Offline Mode UI (L1)
23. Notifications Bell (L1)

### Phase 6: Widget Lab (Week 11-13)
24. Editor Pane (L2)
25. Live Preview (L2)
26. Event Inspector (L2)
27. Manifest Editor (L2)
28. Publish Pipeline (L2)

### Phase 7: Marketplace (Week 14-15)
29. Browse Page (L5)
30. Widget Detail (L5)
31. Install/Uninstall Flows (L5)
32. Reviews Section (L5)

### Phase 8: Social Features (Week 16-18)
33. Profile Pages (L1)
34. Follow System (L1)
35. Posts & Feed (L1)
36. Comments & Reactions (L1)

### Phase 9: Advanced Features (Week 19-20)
37. Pipeline Graph Editor (L4A-3)
38. Integration Management (L3)
39. DataSource Management (L0)

### Phase 10: VR & Polish (Week 21+)
40. VR Entry/Exit (L4B)
41. Version History (L2)
42. AI Generation Panel (L2)

---

## Component Library Recommendations

Based on the UI requirements, consider these libraries:

| Library | Use Case |
|---------|----------|
| `shadcn/ui` | Base component primitives (already in stack) |
| `@radix-ui/*` | Accessible primitives for dialogs, dropdowns |
| `@tanstack/react-table` | DataSource browser, Layers panel |
| `@dnd-kit/core` | Drag-and-drop for layers, assets, nodes |
| `react-resizable-panels` | Editor/preview split panes in Lab |
| `@monaco-editor/react` | Code editor in Lab |
| `reactflow` | Pipeline graph editor |
| `react-colorful` | Lightweight color pickers |
| `framer-motion` | Page transitions, panel animations |
| `sonner` or `react-hot-toast` | Toast notifications |

---

## Notes

- All UI components should consume theme tokens from `uiStore`
- Components dispatch via event bus, never direct store mutation
- Panels in edit mode are hidden in preview mode automatically
- Mobile viewports redirect for Lab and Canvas edit mode
- VR features only render when WebXR is available
