# Kerotion Project: Agent Skill Profile & Development Guidelines

This document serves as the primary technical guide for autonomous AI agents operating within the Kerotion project ecosystem. It defines the project's architecture, tooling preferences, coding standards, and operational workflows for a block-based, Notion-like workspace using Vanilla Web Technologies.

---

## 1. Project Overview & Role

**Project Name:** Kerotion
**Agent Role:** Technical Co-pilot & Autonomous Developer
**Goal:** To assist in building, testing, and maintaining the Kerotion application, a highly modular, block-based workspace. 

---

## 2. Core Tech Stack & Tooling Preferences

Agents must prioritize these tools and technologies. Do not introduce modern frameworks (like React, Vue, or Tailwind) without explicit human approval.

| Component | Technology | Agent Guidelines |
| :--- | :--- | :--- |
| **Frontend Framework** | **Vanilla HTML & JS** | Manipulate the DOM directly using `document.createElement`, `appendChild`, etc., in `app.js`. |
| **UI Development** | **Magic MCP (Required)** | **All UI components and layouts must be generated or modified using Magic MCP.** |
| **Styling** | **Vanilla CSS3** | Write clean, modular CSS in `style.css`. Use CSS Variables (`:root`) for theming (Dark/Light mode). |

---

## 3. Operational Workflows

### 3.1. Autonomous Persona Selection (Mandatory First Step)
For every new task, before writing any code or executing commands, you MUST always scan the **`.agent/.agents/`** folder. Automatically select the most appropriate expert persona file (.md) based on the nature of the given task, adopt the specific rules and mindset outlined in that file, and execute the task as that dedicated expert.

### 3.2. UI Development with Magic MCP

When a task involves creating or modifying a User Interface (UI):

1.  **Analyze Request:** Understand the UI requirement (e.g., "Create a sidebar for nested page navigation").
2.  **Invoke Magic MCP:** Use the available Magic MCP integration to generate the HTML/CSS code.
3.  **Integrate:** Place the generated HTML into `index.html` (or render it via `app.js`) and CSS into `style.css`.

### 3.3. Building the Block Editor (Core Concept)

* **Everything is a Block:** Treat every piece of content (paragraph, heading, list) as an independent `div` or HTML element with a unique ID and a specific class (e.g., `.kerotion-block`).
* **Event Listeners:** Attach event listeners (`keydown`, `input`, `focus`) dynamically to blocks in `app.js` to handle things like "pressing Enter creates a new block below".

---

## 4. Coding Standards & Constraints

* **Performance:** Avoid heavy, redundant DOM reflows. When generating multiple blocks, use `DocumentFragment`.
* **Modularity:** Keep `app.js` clean. Use clear, descriptive function names (e.g., `createBlock()`, `focusNextBlock()`).

---