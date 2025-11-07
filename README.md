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
- **Enhanced node creation** with floating action button, role templates, and guided connection mode.
- **Quick-action buttons** appear on hover for instant creation of related nodes (managers, reports, sponsors, dotted lines).
- **Connection mode** with visual feedback - automatically enters after node creation to guide relationship linking.
- **Right-click menus** on nodes, edges, and the canvas with template support for fast creation, duplication, and layout control.
- **Lens switching** (Hierarchy, Brand, Channel, Department) with color-coded badges and per-lens layouts stored in local storage.
- **Editing workbench** with inline attribute editing, tag selectors, and relationship overviews.
- **Onboarding experience** with helpful overlays, connection guide panel, and interactive tutorials.
- **Undo/redo** history, duplicate/copy/paste, and snap/grid toggles for layout precision.
- **Import/export** JSON support for iterating on real organizational data.
- **Scenario planning** - Create and manage multiple organizational scenarios with side-by-side comparison and diff visualization.
- **Path finder** - Discover connection paths between any two people in the organization with visual path highlighting.
- **Network explorer** - View sphere of influence, direct connections, and collaboration suggestions for any person.
- **Smart connection suggestions** - AI-powered recommendations for dotted-line relationships based on shared dimensions.
- **Inline card editor** - Double-click any person card for instant inline editing with real-time validation and span of control warnings.
- **Span of control analytics** - Visual badges on manager nodes, automatic policy threshold warnings, and comprehensive analytics sidebar.
- **AI-powered import** - Upload screenshots or PDFs of org charts and let AI extract people, roles, and relationships with automatic duplicate detection.
- **Enhanced edge visuals** - Clean line styles with diamond markers for sponsors, dashed lines for dotted relationships, and collapsible legend.

> **📘 See [FEATURES.md](./FEATURES.md) for detailed documentation of all enhanced UX features.**

### Keyboard shortcuts

- `N` &mdash; Add a person at the canvas center and enter connection mode.
- `R` &mdash; Add direct report to selected node.
- `M` &mdash; Add manager to selected node.
- `P` &mdash; Open path finder to explore connections between people.
- `E` &mdash; Explore network for selected person (must have a node selected).
- `⌘/Ctrl + K` &mdash; Open command palette for quick actions.
- `⌘/Ctrl + D` &mdash; Duplicate selected node(s).
- `Delete` &mdash; Remove selected nodes or edges.
- `Esc` &mdash; Exit connection mode, deselect selection, or close context menu.
- `1 · 4` &mdash; Switch between lens presets (Hierarchy, Brand, Channel, Department).

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

### Next steps

- CSV import wizard and schema migrations.
- Group nodes and collapse/expand behaviour.
- Inline mini-card editor on double-click.
- Historical scenario comparison with timeline view.
- AI-assisted org chart generation from text descriptions.
