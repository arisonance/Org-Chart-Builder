## Sonance Matrix Organization Builder

This project is a Next.js + React Flow application for exploring Sonance's matrixed organization across brands, channels, and departments. It provides a dynamic hierarchy canvas, context menus, keyboard shortcuts, and import/export tooling for iterating on real org structures.

### Quick start

```bash
npm install
npm run dev
```

Visit http://localhost:3000 to open the canvas. Sample data is loaded automatically; use the toolbar to reset to the demo, export JSON, or import a previously saved file.

### AI Import Setup (Optional)

To enable AI-powered org chart ingestion from screenshots and PDFs:

1. Copy `.env.local.example` to `.env.local`
2. Add your API key:
   - **Recommended**: Anthropic Claude API key from https://console.anthropic.com/
   - **Alternative**: OpenAI API key from https://platform.openai.com/api-keys
3. Restart the dev server

The app works without API keys, but AI Import will use mock data for demonstration.

### Key features

- **Hierarchy canvas** powered by React Flow with multi-handle connections for managers, sponsors, and dotted-line relationships.
- **Matrix lens switching** (Hierarchy, Brand, Channel, Department) with color-coded badges and per-lens layouts.
- **Right-click menus** on canvas with role templates for fast person creation and duplication.
- **Inline card editor** - Double-click any person card for instant editing of all attributes.
- **Editing panel** with tag selectors for brands, channels, departments, and relationship management.
- **Undo/redo** history, duplicate/copy/paste, and snap/grid toggles for layout precision.
- **AI-powered bulk import** - Upload multiple screenshots or PDFs of org charts and let AI extract people, roles, and relationships.
  - Multi-file batch processing with progress tracking
  - Automatic duplicate detection and merge suggestions
  - Confidence scores for extraction quality
  - Enhanced prompts for matrix organization structures
- **Scenario planning** - Create and compare multiple organizational scenarios side-by-side.
- **JSON import/export** for saving and sharing org chart data.
- **Search and filter** - Find people and filter by any dimension.
- **Auto-layout** with Dagre for clean hierarchical visualization.
- **Enhanced edge visuals** - Clean line styles with diamond markers for sponsors, dashed lines for dotted relationships, and collapsible legend.

### Keyboard shortcuts

- `1-4` &mdash; Switch between lens presets (1=Hierarchy, 2=Brand, 3=Channel, 4=Department).
- `N` &mdash; Add a person at the canvas center.
- `R` &mdash; Add direct report to selected node.
- `M` &mdash; Add manager to selected node.
- `⌘/Ctrl + D` &mdash; Duplicate selected node(s).
- `Delete` &mdash; Remove selected nodes or edges.
- `Esc` &mdash; Deselect or close menus.

### Data schema

Exports include:

- `schema_version`
- Node definitions (people or groups) with attributes
- Edge definitions with relationship type (`manager`, `sponsor`, `dotted`)
- Per-lens layout positions, viewport, and filter state

See `src/data/demo-graph.ts` for a complete example document.

### Repository structure

- `src/lib/schema` &mdash; Domain types, default builders, and lens definitions.
- `src/store/graph-store.ts` &mdash; Zustand-powered graph store with undo/redo and persistence.
- `src/components` &mdash; Canvas, nodes, editor panel, lens switcher, and UI primitives.
- `src/lib/graph` &mdash; Layout helpers and Dagre auto-layout.
- `samples/` &mdash; Example export (`demo.json`) plus companion CSVs (`people.csv`, `relationships.csv`).

### Scripts

```bash
npm run dev     # Start Next.js in dev mode
npm run lint    # Run eslint across the project
npm run build   # Production build (uses Turbopack)
```

### Contributing

This project follows a standard GitHub flow:
1. Create a feature branch from `main`
2. Make your changes
3. Commit with clear messages
4. Push and create a pull request
5. Review and merge

### What's new - Simplified for Scale

This app has been dramatically simplified to focus on what matters: visualizing matrix organizations at scale and quickly importing existing org charts.

**Removed complexities:**
- Advanced analytics and span-of-control dashboards
- Path finder and network explorer
- Command palette and excessive keyboard shortcuts
- Bulk operations and matrix assignment wizards

**Improved for production use:**
- Multi-file AI import with batch processing
- Better duplicate detection and merge workflows
- Enhanced matrix org extraction (brands, channels, departments)
- Retry logic and rate limiting for AI API calls
- Cleaner UI optimized for large teams (100+ people)

The core focus is now on importing your existing org charts quickly and understanding matrix relationships through different lenses.
