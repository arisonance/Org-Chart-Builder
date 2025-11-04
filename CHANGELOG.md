# Changelog

## [Unreleased] - 2025-10-21

### Major Features Added

#### 🎭 Scenario Planning & Comparison
- Create multiple organizational scenarios to explore different structures
- Side-by-side comparison with visual diff (green=added, yellow=modified, red=removed)
- Summary statistics showing impact of changes
- Categorized changes (people, relationships, attributes) with severity indicators
- Persistent storage of all scenarios in local storage
- Quick switching between scenarios via dropdown
- Edit, duplicate, and delete scenario management

**New Files:**
- `src/lib/scenario/types.ts` - Scenario and diff type definitions
- `src/lib/scenario/diff.ts` - Diff computation and change categorization
- `src/components/scenario-manager.tsx` - Scenario CRUD interface
- `src/components/scenario-comparison.tsx` - Visual comparison modal

#### 🔍 Path Finder & Network Analysis
- Find shortest and alternative paths between any two people
- Visualize sphere of influence and network connections
- Calculate centrality scores and identify bridge nodes
- Smart connection suggestions based on shared dimensions
- Interactive path highlighting on canvas
- Keyboard shortcuts: P (path finder), E (network explorer)

**New Files:**
- `src/lib/graph/pathfinding.ts` - BFS/DFS path finding algorithms
- `src/lib/graph/network-analysis.ts` - Centrality and influence calculations
- `src/lib/graph/clustering.ts` - Subgraph identification
- `src/components/path-finder-panel.tsx` - Path discovery UI
- `src/components/relationship-explorer.tsx` - Network visualization
- `src/components/connection-suggestions.tsx` - Smart recommendations

#### ✏️ Inline Card Editor
- Double-click any person card for instant inline editing
- Floating popover editor appears directly over the card
- Real-time span of control validation with policy warnings
- Toggle brand/channel/department chips
- Auto-save on click outside or ESC key
- No context switching - edit where you're looking

**New Files:**
- `src/components/inline-card-editor.tsx` - Popover editor component

#### 📊 Span of Control Analytics
- Visual badges on manager nodes showing direct report count
- Color-coded status: Green (≤8), Amber (9-11), Red (12+)
- Comprehensive analytics sidebar with org health metrics
- Lists of leaders exceeding policy thresholds
- Distribution charts and average span calculations
- Click any leader in analytics to focus on their card

**New Files:**
- `src/lib/analytics/span-of-control.ts` - Span calculation utilities
- `src/components/analytics-sidebar.tsx` - Analytics dashboard

#### 🤖 AI-Powered Org Chart Import
- Upload screenshots or PDFs of org charts
- AI vision models extract people, roles, and relationships
- Automatic duplicate detection with fuzzy name matching
- Smart merge strategies: create/update/skip
- Conflict detection for title and location mismatches
- Batch processing of entire org chart sections
- Works with Claude 3.5 Sonnet or GPT-4V
- Falls back to mock data if no API keys configured

**New Files:**
- `src/lib/ai/vision-parser.ts` - AI vision integration
- `src/lib/ai/duplicate-detection.ts` - Fuzzy matching and merge logic
- `src/components/ai-import-wizard.tsx` - Multi-step import UI
- `src/app/api/parse-org-chart/route.ts` - Next.js API endpoint

#### 🎨 Enhanced Edge Visuals
- Custom edge components with clean line styles
- Diamond markers for sponsor relationships (UML-style)
- Dashed lines for dotted/advisory relationships
- No text labels - visual clarity improved
- Collapsible relationship legend with examples
- Zoom-aware rendering for performance

**New Files:**
- `src/components/custom-edges.tsx` - Custom React Flow edge components
- `src/components/relationship-legend.tsx` - Interactive legend panel

### State Management Updates
- Added scenario management state and actions to graph store
- Path finder mode and explorer mode tracking
- Highlighted path state for visual feedback
- Persist scenarios and active scenario ID
- Updated store version to v3 with migration

### UI/UX Improvements
- Toolbar reorganized with new action buttons
- Command palette extended with path finder and explorer commands
- Editor panel now shows connection suggestions automatically
- "Network" button added to editor panel for quick access
- Analytics button in bottom-right corner
- All new features support dark mode
- Keyboard shortcuts expanded (P, E keys)

### Documentation
- Updated README.md with new features and setup instructions
- Expanded FEATURES.md with detailed usage guides
- Added .env.local.example for API key configuration
- Comprehensive inline documentation in all new modules

### Developer Experience
- Zero linter errors across all new code
- Full TypeScript typing throughout
- Clean component architecture
- Reusable utility functions
- Performance-optimized with useMemo/useCallback

---

## Previous Features (Existing)

### Core Functionality
- React Flow-powered canvas with multi-handle connections
- Lens switching (Hierarchy, Brand, Channel, Department)
- Node creation with role templates (C-Suite, VP, Director, Manager, IC)
- Connection modes (manager, sponsor, dotted-line)
- Floating action button and quick-action hover buttons
- Right-click context menus
- Command palette (Cmd/Ctrl+K)
- Undo/redo with 100-step history
- Copy/paste and duplicate operations
- Auto-layout with Dagre algorithm
- JSON import/export
- Grid and snap-to-grid toggles
- Full-screen canvas mode
- Onboarding overlay for new users
- Connection helper panel
- Lock/unlock node positions

### Technical Stack
- Next.js 15 with App Router
- React 19
- TypeScript
- React Flow for graph visualization
- Zustand for state management
- Radix UI for accessible components
- Tailwind CSS for styling
- Immer for immutable updates
- Dagre for layout algorithms


