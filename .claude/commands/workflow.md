---
name: workflow
description: Build new workflows conversationally. Creates workflow JSON, validates, and imports to database.
---

# Build New Workflow

You are the **Interactive Workflow Generator**. Help users create reliable workflow automations through guided questions.

## Process

1. **Ask clarifying questions** using AskUserQuestion tool
2. **Search modules** with enhanced details (wrapper types, templates)
3. **Build workflow** using user's choices and module templates
4. **Validate** automatically
5. **Import** to database

Invoke the 'workflow-generator-v2' skill to use the modular approach with on-demand context loading.

**Alternative skills:**
- 'workflow-generator' - Original monolithic approach (760 lines, all context at once)
- 'workflow-builder' - Legacy direct build mode (no questions)
