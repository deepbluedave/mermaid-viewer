# Editing controls

Status: Implemented. Verification is recorded in [Acceptance verification](tests/ACCEPTANCE.md).

This spec defines the first update to the editing controls. It uses short sentences, consistent names, and one requirement per rule.

## 1. Purpose

Put common actions where the user can find them after selecting an object.

The user must be able to change a node, connection, or zone without searching the Properties panel. Keep Properties available for precise values and detailed information.

Use the existing editing operations. Keep the current project JSON format. Generate Mermaid from the diagram model. F3, the proposed flow and loop layout feature, remains a separate task.

## 2. Names

Use these names in the interface and in this spec.

| Name | Meaning |
| --- | --- |
| Node | A shape with a label. A node can contain other objects. |
| Connection | A line between two objects. The model calls it an edge. |
| Zone | A frame that contains nodes or other zones. |
| Object | A node, connection, or zone. |
| Selection bar | A fixed row of actions for the current selection. |
| Action menu | A menu opened by right-click, long-press, or More. |
| Attachment | The place where one end of a connection meets an object. |
| Source | The first object in a connection. |
| Target | The second object in a connection. |
| Waypoint | A user-set point on a connection route. |
| Properties | The panel with fields for the selected object. |

Use labels with a clear object or purpose. Use **Fit diagram**, **Fit to label**, and **Fit to contents**. Use **Reset route**, **Reset label position**, and **Reset side order**. Do not use a single Reset action for these different operations.

## 3. Locations

### 3.1 Wide layout

Use this layout when the window is wider than 850 CSS pixels.

| Location | Contents | Purpose |
| --- | --- | --- |
| Single application header | Compact branding; File, Edit, View, Diagram; Select, Pan, Node, Zone, Connect; Undo, Redo, Delete; Open, Save | Manage the project and choose an editing tool without separate full-width control rows. |
| Sticky Properties heading | Selection name, common actions, More | Edit the current selection. Align and Distribute appear for multiple selections. |
| Lower-right corner of the canvas | Zoom out, zoom value, Zoom in, Fit diagram, Snap grid, Guides | Change the view and editing aids. |
| Properties, on the right | Fields grouped as specified in section 9 | Enter precise values and context. |
| Beside a selected attachment | Attachment controls | Change that attachment's side or order. |
| At the point of a right-click | Action menu | Act on the object or canvas location under the pointer. |

The desktop header is 56 CSS pixels high. Selection changes never move the canvas vertically. Common actions belong to the inspector rather than a separate full-width selection row. When Properties is hidden through View, header buttons retain access to Selection actions and Properties.

File contains New diagram, Open, Recent files, Save project, Save as, Download a copy, an optional Autosave checkbox and an Export submenu for SVG, PNG and Mermaid. Edit contains Undo, Redo, Copy and Paste. The footer identifies the working file and its save state. Unsaved transitions use a keyboard-accessible dialog; file failures, external changes and recovery use an actionable canvas notice that preserves existing control focus. View contains Hierarchy, Mermaid source, Properties and Fit diagram. Diagram contains Theme, Flow direction, Layout style, Auto layout and Text size. Open and Save are paired in the header. Creation tools are ordered Node, Zone, Connect. Submenus fly out beside their parent without replacing it; shape choices show decorative miniature previews. Layout preferences do not rearrange objects until Auto layout is chosen.

### 3.2 Narrow layout

Use this layout when the window is 850 CSS pixels wide or less.

| Location | Contents | Purpose |
| --- | --- | --- |
| Header, first row | Compact branding, File, Edit, View, Diagram, Save | The same menus as desktop. Hide the app-name and Save text at small widths while retaining accessible names. |
| Header, second row | Current tool, Undo, Redo, Selection actions, Properties | The tool chooser offers Select, Pan, Node, Zone and Connect. Selection actions opens the complete applicable object menu. |
| Properties sheet | Sticky selection actions followed by precise fields | Open through the header Properties button or an object's Details action. |

- Reserve 108 CSS pixels for the two header rows. Keep the canvas directly beneath them; no bottom selection bar is reserved.
- Keep each header, menu and action touch target at least 44 by 44 CSS pixels.
- Close Hierarchy/Source and Properties by default. View opens the source/hierarchy overlay; Properties opens a bottom sheet.
- Give the Properties sheet a visible Close button. Limit its height to 80% of the window height and scroll the fields inside it.
- Escape closes the Properties sheet and returns focus to the visible header Properties button. Commit pending fields by their existing rules and retain selection.
- Fit popovers and menus within the window. Scroll long menus inside their frame.
- Opening, closing or resizing controls must not run Auto layout or Fit diagram. Preserve desktop panel visibility when switching between narrow and wide layouts.

Use the action order in section 4 on both layouts. A narrow layout changes visibility, not the command's meaning.

## 4. Selection actions

Show the object type and its label. For example, show **Node · Launch drones** or **Zone · Climate loop**. Show the full label in an accessible name if the visible text is shortened. Use the object type when its label is empty.

Show the following actions in this order. More is the last action.

| Selection | Visible actions | What the actions do |
| --- | --- | --- |
| One node | Shape, Color, Connect, Fit to label, More | Change the shape or colors. Start a connection from this node. Clear its manual size preference. |
| One connection | Line style, Arrows, Add waypoint, Attachments, More | Change the line or arrow display. Place a waypoint. Set either attachment. |
| One zone | Fit to contents, Padding, Color, More | Fit the frame. Set its four padding values. Change its colors. |
| Two or more objects | Align, Distribute, Fit zones when applicable, More | Arrange movable objects. Fit selected zone frames. |
| One active waypoint | Remove waypoint, Connection actions, More | Remove this point. Open actions for its connection. |
| No selection | More | Open canvas actions. Creation actions enter their normal placement tools. |

Do not apply a single-object toolbar action to a mixed selection. The first version does not add bulk shape, color, or connection-style editing.

Align requires at least two selected roots. Distribute requires at least three. A root is a selected node or zone with no selected ancestor. Connections do not count as roots.

Disable an unavailable action. Give a short reason on focus or hover. For example, use **Select at least three separate nodes or zones**. Keep the same state after import, Undo, Redo, and selection changes.

For Fit zones, include all selected zones. Fit selected inner zones before selected outer zones. An unselected inner zone keeps its current size.

## 5. Action menus

Use the same values and availability rules in all control locations. Each command must call the same operation wherever it appears. A shorter bar label can omit words when the selection states the target.

### 5.1 Object menus

Use the order below. Put Delete in the last group.

| Menu target | Menu contents, in order |
| --- | --- |
| Node | Edit label; Shape; Color; Connect from here; Fit to label; Enable container or Disable container; Details; Delete node |
| Connection line | Edit label; Line style; Arrows; Add waypoint here; Attachments; Reset label position; Reset route; Details; Delete connection |
| Connection label | Edit label; Reset label position; Connection actions |
| Zone | Edit label; Fit to contents; Padding; Color; Details; Delete zone |
| Waypoint | Remove waypoint; Connection actions |
| Attachment | Open the attachment controls in section 7. |
| Multiple objects | Align; Distribute; Fit selected zones when applicable; Details; Delete selection |
| Empty canvas | Add node here; Add zone here; Fit diagram |

Shape offers Rectangle, Rounded rectangle, Diamond, Circle, and Database cylinder.

Color opens Background color and Text color. Provide a picker and a six-digit hex field for each color. Connections use Line style; they do not get a new color command in this update.

Theme opens four diagram preview cards: Clean, Blueprint, Botanical, and Paper. Apply a chosen theme immediately as one Undo step. Keep the chooser open for comparison. Preserve explicit object color overrides and all geometry, routes, waypoints and label placements.

Show Theme or Custom beside each object color in Color and Properties. Show Reset to theme only for custom colors. Reset only that field. A fill edit must not create a text override. Automatic text must remain readable on the displayed background. Explicit text colors remain the user's choice. Cancel restores a Color edit, including resets. Applying an untouched Color popup must not add overrides or an Undo record.

Line style offers Normal, Dashed, and Thick. Arrows offers One arrow, No arrows, and Two arrows. One arrow points from source to target.

Align offers Left, Horizontal center, Right, Top, Vertical center, and Bottom. Distribute offers Across and Down. These choices use the existing alignment and distribution operations.

Connect from here enters Connect with the clicked node as its source. Keep the source visible. The next valid object becomes the target. Escape cancels the pending connection.

In Connect mode, pressing anywhere on a node or zone body and dragging to another object creates a preview and highlights the valid target. Release over the target creates one connection and returns to Select with the connection selected. This includes parent-node bodies and zone targets; routing, parallel edges, self-loops and explicit handle sides keep their existing meaning. A source press/release without movement also retains click-to-click creation. Empty drops, Escape, pointer cancellation or capture loss clear the preview without creating an edit; an invalid drop leaves Connect available for a retry. Long-press still opens actions, and a second touch cancels a pending drag.

Details opens Properties. If a menu action needs a specific field, reveal that field. For a connection, Source and Target remain editable in Properties. For a node or zone, Parent remains editable there.

Connection actions opens the full connection menu for the point, label, or attachment's owning connection. It must not act on a nearby connection.

### 5.2 Choose the target

- Right-click a selected object to keep the current selection. Open the multiple-object menu if more than one object is selected.
- Right-click an unselected object to select that object alone. Open its menu.
- Right-click an empty part of the canvas to open the canvas menu. Keep the current selection until a creation command changes it.
- When one connection is selected, give its waypoint, attachment, or label priority over the line. Use that part's menu.
- Use the visible top object when objects overlap. The user can select a covered object through Hierarchy, then use More.
- Store the clicked canvas position before opening a menu. Moving the menu to fit the window must not change that position.

Add node here and Add zone here create the object at the stored position. Use the existing placement and containment rules. Do not make the user click the canvas again.

Add waypoint here inserts a waypoint at the stored position. Use the existing source-to-target order, snapping, and routing rules. Add waypoint in the selection bar enters point placement and waits for a canvas click or tap.

More uses the current selection. With no selection, it offers Add node, Add zone, and Fit diagram. These creation actions enter placement mode because More has no clicked canvas position.

## 6. Direct canvas editing

Keep the current direct editing methods available.

| Part | Direct action | Result |
| --- | --- | --- |
| Node or zone body/title | Drag | Move the selection. Move contained objects with their parent. |
| Resize handle | Drag | Resize the object within its current limits. |
| Connection segment plus handle | Drag | Add and position a waypoint. |
| Waypoint | Drag | Move this waypoint. |
| Connection label | Drag | Move the label. Keep its connection route. |
| Attachment handle | Drag | Reconnect this end of the connection. |
| Attachment handle | Click or tap without a drag | Open controls for this end of the connection. |

Use a movement threshold of four screen pixels to distinguish an attachment click from a drag. Once the threshold is crossed, keep the operation as a reconnect drag. Do not open its controls on release.

Preserve the existing cancellation and pointer-capture rules. A cancelled drag must restore geometry, membership, manual preferences, and selection.

## 7. Attachment controls

Open a small popover beside the clicked attachment. Opening Attachments from the selection bar offers Source and Target tabs in the same popover.

Show which end and object the controls affect. For example:

```text
Source · Launch drones
Left side · 2 of 3 · Manual order

Side: Automatic | Top | Right | Bottom | Left

Move up      Move down
Reset side order
```

- Side changes only this end's forced side. Automatic releases that side choice.
- Move up and Move down change the order on a left or right side.
- Move left and Move right change the order on a top or bottom side.
- Disable movement past the first or last attachment. Give the reason **Already first** or **Already last**.
- Disable Reset side order when the side has automatic order.
- Reset side order releases the saved order for the whole active side. Show **Applies to all attachments on this side** beside the action.
- Keep order preferences on other sides.
- Keep attachment spacing automatic. These controls do not set an exact position along a side.
- Each side or order action is one undoable edit.
- Keep the popover open after an action. Update its side, position count, status, and available movement buttons.
- If an object moves or resizes, keep the popover beside its attachment. Close it if the connection is deleted, is no longer selected, or its endpoint changes to another object.

The Launch drones case must work as follows. Select the dotted connection. Open its left attachment. Choose Move down. Its attachment moves below the solid connection's attachment. The label and both connections remain identifiable throughout the action.

## 8. Edit popovers and menu behavior

Edit label opens a small text editor near its invoking control or menu. Padding opens Below title, Right, Bottom, and Left fields. Color opens its two color fields. Show diagram units beside padding fields. Accept the existing range of 0 to 1,000.

Use Apply and Cancel for these edit popovers. Preview valid edits on the diagram. Apply creates one Undo record for the edit session. Cancel or Escape restores the diagram from before the session, including any size changes from preview.

Padding changes can grow a frame. Reducing padding does not shrink the frame. Fit to contents is a separate action.

Menu choices for Shape, Line style, Arrows, and alignment apply immediately. Each choice creates one Undo record. Color uses the edit popover rules. Properties keeps its existing field commit rules.

- Open one action menu or popover at a time.
- A menu must not move the diagram or add an Undo record when it opens.
- A menu must not cause a left-button drag, pan, or reconnect operation.
- Close an action menu on Escape or a click outside it. Closing it does not undo an action already applied.
- A click outside an edit popover applies a valid draft once, then closes it. Continue the clicked action. Do not add a second Undo record.
- If the draft is invalid, keep the editor open. Explain the error beside the field. Focus that field and stop the clicked action.
- Apply a valid active edit before Save project or Export. If a field is invalid, keep the editor open and focus the field. Do not continue the requested save or export.
- Apply a valid active edit before changing the selection or starting another edit. An invalid edit must be corrected or cancelled first.
- Close an action menu when the user starts a canvas drag or changes the view.
- Keep the existing browser menu in text fields, Source, Properties, and other page controls. Replace it only on the diagram canvas.
- Exclude all menus, bars, popovers, and editor handles from SVG and PNG exports.

## 9. Properties

Keep the existing fields and commands. Put them in the following groups. A common command can remain in Properties as another way to reach the same operation.

| Group | Fields and commands | Purpose |
| --- | --- | --- |
| Label | Label or zone title | Edit multiline text. |
| Context | Description and Notes | Keep explanatory information immediately beneath Label. |
| Appearance | Node shape; node/zone background and text colors; connection line style and arrows | Enter or review display choices. |
| Geometry | Width and Height; current position as read-only text; Fit to label or Fit to contents; zone padding | Enter precise dimensions and spacing. |
| Structure | Parent; Container node; connection Source and Target | Change containment or connection endpoints. |
| Connection route | Straight/Orthogonal; Source and Target attachments; side order; waypoint list and conflicts; Reset route | Review and adjust routing preferences. |
| Connection label | Automatic/manual placement status; Reset label position | Review label placement. |
| Connections | Connections for a selected node or zone | Select a related connection. |

Show only applicable groups. Label and Context come first for nodes, zones and connections. Use compact inline shape/parent fields, paired Width/Height and Fill/Text controls, and short text areas that grow to fit entered content while retaining focus. Refit existing text when a hidden Properties sheet opens or the panel width changes. Keep long notes scrollable after the height limit. Show color resets only for overrides; put repeated explanatory help in expandable details. Keep selection changes, current values, disabled states and previews in sync across all control locations.

The multi-selection Properties view keeps its alignment, distribution, and zone-fit actions. Details for a mixed selection opens this view. It does not silently choose one object.

## 10. Existing editing rules

The new control locations must use the following rules.

- Moving and aligning containers preserves their internal arrangement. Each descendant moves once.
- Fit to contents changes zone frames. It keeps child coordinates fixed.
- Resizing respects titles, labels, contents, padding, opposite anchors, and current node spacing.
- Manual waypoints remain fixed for a single endpoint move. They move once when both endpoints have the same translation in one action.
- Reset route removes manual waypoints. It keeps forced sides, side order, and manual label position.
- Straight routing remains unavailable while manual waypoints exist. Explain **Reset the route before choosing Straight**. Do not clear points as a hidden side effect.
- Reset label position restores automatic placement. It keeps the route and waypoints.
- Show a leader line when the label's route attachment lies outside its box. Keep this rule for automatic and manual labels.
- Deleting a zone retains its contents. Deleting a node removes its incident connections. Deleting a container node retains its child objects.
- Delete in the main toolbar removes an active waypoint when one is selected. Otherwise, it deletes the selected objects. Its label must identify the active target.
- Opening controls and changing selection do not run Auto layout.
- Save/open, Mermaid generation, and image exports retain their existing meanings.

## 11. Touch and keyboard access

- More gives access to every applicable object-menu command. Right-click and long-press are shortcuts.
- Open an action menu after a 500 ms long-press on the canvas.
- Cancel a pending long-press when a drag crosses its movement threshold. Also cancel it after movement greater than eight screen pixels.
- Cancel a pending long-press on a second touch, release, or capture loss.
- A long-press must not leave a drag, pan, selection box, or reconnect change behind. Prevent the extra tap that can follow its release.
- Use Shift+F10 or the Menu key to open the current selection's action menu from the canvas.
- With no selection, keyboard canvas creation uses the visible canvas center.
- Let keyboard users reach all selection-bar actions and attachment controls.
- File/View/Diagram use a roving tab stop: Left/Right switches the focused menu and Down opens it. Open desktop menus also switch when hovering another menu title.
- Up/Down, Home/End and text typeahead move through menu items. Enter or Space activates an item. Right opens a submenu; Left or Escape returns to its parent. Escape closes the top-level menu. Tab closes it and advances focus; edit dialogs retain their focus trap.
- Invoking the same menu again toggles it closed. Menu navigation must not reach canvas movement/tool shortcuts or create Undo records.
- Return keyboard focus to the invoking control after a menu closes. If that control was deleted, return focus to the canvas.
- Keep normal arrow-key diagram movement available when a menu or editor does not have focus.
- Give every icon button a visible tooltip and an accessible name. State current choices and unavailable actions to assistive technology.
- Disable editing actions during startup, import, and Auto layout. Restore the correct action states after completion.

## 12. Acceptance tests

Use real mouse, touch, keyboard, file-picker, and export actions. Record a project snapshot to compare geometry and saved preferences.

| ID | Scenario | Required result |
| --- | --- | --- |
| UI-01 | Select a node. Change Shape and Color from the sticky Properties actions or the header Selection actions menu. Start a connection with Connect. | Every action is available with the inspector open or closed. Existing shape, color, and connection rules hold. |
| UI-02 | Change one connection through the bar, its action menu, and Properties. | Each surface shows the same values. Each action uses the same operation and Undo behavior. |
| UI-03 | Right-click a selected group, then an unselected object. | The group keeps its selection. The unselected object becomes the sole selection. No object moves. |
| UI-04 | Right-click empty canvas at 25%, 100%, and 200% zoom. Create a node and a zone. | Each object uses the clicked diagram position, current snapping, and correct parent membership. |
| UI-05 | Use Add waypoint here. Then use Add waypoint from the bar. | The menu adds a point at its stored location. The bar waits for point placement. Both preserve point order and conflict behavior. |
| UI-06 | Move the dotted Launch drones attachment below the solid attachment. Undo and Redo. | The chosen order changes and restores correctly. Controls remain beside the correct attachment. |
| UI-07 | Test Source and Target controls on all four sides. Include a self-loop and a crowded side. | Labels, counts, movement directions, limits, and whole-side reset are correct. Spacing remains automatic. |
| UI-08 | Click an attachment. Drag it instead. Cancel another drag. | Click opens its controls. Drag reconnects. Cancel restores the previous state. No accidental popup opens after a drag. |
| UI-09 | Fit a zone and edit padding with Properties closed. Include nested zones. | The frame fits correctly. Child coordinates stay fixed. Padding Apply is one edit. Cancel restores preview geometry. |
| UI-10 | Align and distribute zones, mixed movable objects, and selected ancestors/descendants. | The correct root count controls availability. Internal arrangements and existing clearance rules hold. |
| UI-11 | Edit a label or color from a menu. Try Apply, outside-click, Cancel, Escape, and invalid padding. | Valid preview is visible. Apply and outside-click each commit once. Cancellation restores the opening state. Invalid values stay editable. |
| UI-12 | Move a connection label away from and back over its route. Reset its label position and route separately. | Leader lines follow the existing rule. Each reset changes only its named preferences. |
| UI-13 | Long-press an object, label, waypoint, attachment, and empty canvas. Then try a drag and a second touch. | The correct menu opens. Movement or a second touch cancels the pending menu. No unintended edit or extra tap occurs. |
| UI-14 | Use a 390 by 844 window. Edit a node, connection, zone, and group through Selection actions and More. | Every action is reachable. Touch targets meet the minimum size. Controls stay within the window. Properties does not occupy the canvas by default. |
| UI-15 | Use a 1024 by 768 window and a wide desktop window. Switch selection types and open menus near each corner. | The header keeps a stable height and selection actions remain in Properties. Menus stay visible. Controls do not cover their target unnecessarily. |
| UI-16 | Use only a keyboard to open More and an attachment popover, edit values, cancel, and delete. | Commands and focus are correct. Existing diagram shortcuts still work outside the controls. |
| UI-17 | Open menus or edit popovers during save/export and asynchronous operations. | Valid edits commit once before saving. Invalid edits block the request. Busy states restore correctly. No editor controls appear in exports. |
| UI-18 | Delete a waypoint, connection, node, and zone through their menus. Undo each action. | Each command deletes its named target. Zone and container contents follow the existing retention rules. |
| UI-19 | Save and reopen the edited project. Apply matching-ID source. Undo and Redo edits from each surface. | Geometry and applicable manual preferences survive. The project format remains compatible. |
| UI-20 | Run the existing model, routing, browser, and native regression suites. | Existing operations still pass. Record and resolve any new regression before release. |

Additional polish acceptance: verify Description/Notes precede appearance, dimensions and colors share rows, custom-only resets, content growth after opening a hidden sheet, one desktop header, and unchanged model/history during menu navigation. Verify body-drag creation for node/node, node/zone, zone/parent and parent/node, valid target highlighting, release-only commit, click-to-click fallback, Undo/Redo and cancellation. Test widths 320, 390, 600, 850, 1024, 1280 and 1800, including 44px narrow-layout controls and sheet focus return.

## 13. Delivery order

1. Give existing commands shared target, availability, and execution rules.
2. Add the selection bar and More menus.
3. Add right-click menus and edit popovers.
4. Add attachment click controls while preserving reconnect drags.
5. Add the narrow layout, long-press, and keyboard behavior.
6. Run the acceptance scenarios and existing regression suites.
7. Review screenshots of a busy diagram and the narrow layout.

The implemented update is ready for user review when all first-version controls and acceptance scenarios are complete.

## File and clipboard controls

File and clipboard semantics are specified in [SPEC.md](SPEC.md). Autosave is a persistent browser preference. It remains selectable without a working file; actual writes require a supported browser and a connected file. It never requests permission from a timer. Restore recovery is clearly separate from Saved and restores with no assumed connection.

Node/zone/connection and multi-selection action menus include Copy and Paste/Paste here before Details/Delete. Copy targets the captured selection; Paste here uses the captured diagram point, not the menu's DOM position. Copy/Paste also appear in Edit with their shortcuts. Text fields keep native copy/paste. File notices must not be rebuilt during a pointer action when their content is unchanged; queued file reads/writes must not steal typing focus or split an input session's Undo step.

Nodes and zones expose a Show description checkbox in Properties and object menus. Preserve the label in hierarchy/source. Use wrapped description text on the canvas and in image exports; reserve space above children for parent descriptions.
