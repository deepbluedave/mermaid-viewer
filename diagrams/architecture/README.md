# Southartica application architecture

Open [southartica.mermaid-project.json](southartica.mermaid-project.json) in Diagram Studio for the full editable architecture with Blueprint, arranged zones, manual routing and context. [Mermaid source](../southartica-architecture.mmd) contains the same supported structure and introductory comments. [SVG](southartica.svg) and [PNG](southartica.png) show the finished appearance.

The outer **Southartica · Diagram Studio** zone (`DiagramStudio`) holds the overall description and working notes. Select it, open **Details**, and read **Context → Description / Notes**. Its notes cover the architecture, source of truth, editing/routing contracts, module responsibilities, library boundaries, verification and deferred F3 layout work.

All 17 components, seven zones and 16 connections have descriptions and notes. These fields live in the project JSON. Ordinary Mermaid comments do not populate those fields, and the editor regenerates ordinary source comments away. Applying source over the project retains context for matching IDs; opening Mermaid on its own restores structure with the default layout and theme.

Solid arrows show data and edit flow, dotted arrows show delegation to bundled engines, and undirected lines show design/verification support. This is a responsibility view, not an exhaustive JavaScript import graph. Mermaid, ELK and libavoid remain unmodified upstream libraries.

The diagram was imported, themed and refined in the editor with attachment sides, waypoints and label positioning. Native file-picker save/reopen restored the exact project. Reapplying its Mermaid source preserved all 40 descriptions/notes and Blueprint; opening Mermaid separately reproduced the structure. [Review results](review.json), [editor screenshot](editor-blueprint.png) and [project-context screenshot](editor-project-notes.png) record the checks.
