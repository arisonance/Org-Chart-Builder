# Enhanced Node Creation & Connection Features

This document describes the comprehensive UX enhancements for adding and connecting nodes in the org chart builder.

## 🎯 Overview

The org chart builder now includes extensive usability improvements for creating and connecting people nodes, with multiple intuitive interaction methods, visual feedback, and guided workflows.

## ✨ Key Features

### 1. Floating Action Button (FAB)
- **Location**: Bottom-right corner of the canvas
- **Purpose**: Quick access to node creation
- **Features**:
  - Gradient blue circular button with + icon
  - Opens a menu with "Add Person" and role templates
  - Templates include: C-Suite, VP, Director, Manager, IC
  - Each template pre-fills appropriate attributes

### 2. Connection Mode
- **Trigger**: Automatically activates after adding certain nodes
- **Visual Feedback**:
  - Instructional banner at top: "Click a person to connect, or press ESC to cancel"
  - Source node pulses with animation
  - Target nodes highlight with animated border on hover
  - Cancel button in overlay
- **Behavior**:
  - Click any node to create relationship
  - Press ESC to exit without connecting
  - Automatically exits after successful connection

### 3. Quick-Action Buttons
Hover over any node card to reveal contextual action buttons:
- **Top**: "Add Manager" - Creates and connects a new manager
- **Bottom**: "Add Report" - Creates and connects a new direct report
- **Left**: "Add Dotted" - Creates dotted-line relationship
- **Right**: "Add Sponsor" - Creates executive sponsor relationship

### 4. Keyboard Shortcuts
- `N` - Add new person at canvas center (enters connection mode)
- `R` - Add direct report to selected node
- `M` - Add manager to selected node
- `Cmd/Ctrl + D` - Duplicate selected nodes
- `ESC` - Exit connection mode

### 5. Connection Helper Panel
- **Location**: Top-left corner of canvas
- **Expandable panel** showing:
  - Visual legend for connection types (Manager, Sponsor, Dotted Line)
  - Color-coded handles with descriptions
  - Quick tips for creating connections
  - Toggle button to show/hide

### 6. Enhanced Visual Feedback
- **Handle Animations**: Handles scale on hover with smooth transitions
- **Connection Targets**: Valid nodes pulse during drag operations
- **Edge Selection**: Selected edges glow with drop-shadow effect
- **Smooth Transitions**: All movements and state changes are animated

### 7. Onboarding Experience
- **Empty State**: Welcoming card appears when canvas is empty
- **Quick Tips**: Shows key interactions and shortcuts
- **Animated Pointer**: Points to FAB button
- **Dismissible**: Close button to hide and start working

### 8. Role Templates
Pre-configured templates for common roles:
- **C-Suite Executive**: CEO, CFO, COO level
- **Vice President**: VP-level leadership
- **Director**: Director-level management
- **Manager**: Team lead/manager
- **Individual Contributor**: Specialist/IC

Each template includes:
- Default name and title
- Appropriate tier badge
- Icon for visual identification
- Quick description

## 🎨 Visual Design

### Color Coding
- **Manager**: Sky blue (#0ea5e9)
- **Sponsor**: Amber (#f59e0b)
- **Dotted Line**: Indigo (#6366f1)

### Animations
- Pulse animations for connection mode
- Scale transitions on hover
- Smooth fade-ins for overlays
- Border animations for targets

### Dark Mode
All new components fully support dark mode with appropriate contrast and theming.

## 🚀 Usage Examples

### Adding a Person with Template
1. Click the blue + button (FAB) in bottom-right
2. Select a role template (e.g., "Director")
3. System enters connection mode
4. Click existing person to connect as manager
5. Or press ESC to skip connection

### Quick Add Direct Report
1. Hover over any person card
2. Click "+ Report" button at bottom
3. New person added and connected immediately
4. Edit details in right panel

### Using Keyboard Shortcuts
1. Select a person
2. Press `R` to add direct report
3. Or press `M` to add manager
4. New node created and auto-connected

### Right-Click Context Menu
1. Right-click anywhere on canvas
2. Choose "Add from template"
3. Select role type
4. Node created at click location

## 🔧 Technical Details

### New Files
- `src/lib/schema/templates.ts` - Role template definitions
- `src/components/onboarding-overlay.tsx` - Empty state UI
- `src/components/connection-helper.tsx` - Connection guide panel

### Modified Files
- `src/components/hierarchy-canvas.tsx` - Main canvas with FAB and connection mode
- `src/components/hierarchy-node.tsx` - Quick-action buttons
- `src/store/graph-store.ts` - Connection mode state management
- `src/app/globals.css` - Visual feedback animations

### State Management
Connection mode stored in Zustand store:
```typescript
{
  active: boolean,
  nodeId: string | null,
  type: RelationshipType
}
```

### Key Functions
- `enterConnectionMode(nodeId, type)` - Start connection mode
- `exitConnectionMode()` - Cancel connection mode
- `connectInConnectionMode(targetId)` - Complete connection

## 📱 Responsive Behavior
- FAB positioned relative to canvas viewport
- Panels use backdrop-blur for glass-morphism effect
- Touch-friendly button sizes
- Keyboard navigation support

## ♿ Accessibility
- All buttons have proper focus states
- Keyboard shortcuts for main actions
- Clear visual feedback for all states
- Semantic HTML structure
- ARIA labels where appropriate

## 🎓 Learning Curve
New users benefit from:
1. Onboarding overlay on empty canvas
2. Connection helper panel for reference
3. Hover tooltips on all buttons
4. Visual feedback during interactions
5. Forgiving undo/redo system

## 🎭 Scenario Planning & Comparison

### Overview
Create and manage multiple organizational scenarios to explore different structures and compare them side-by-side.

### Key Features

#### Scenario Manager
- **Location**: Header toolbar next to lens switcher
- **Create scenarios**: Branch from current state or start fresh
- **Quick actions**: Edit, duplicate, delete scenarios
- **Scenario dropdown**: Shows active scenario with green indicator
- **Persistent storage**: All scenarios saved to local storage

#### Scenario Comparison
- **Trigger**: "Compare Scenarios" button (requires 2+ scenarios)
- **Split view**: Shows detailed diff with color coding
- **Summary stats**: Count of additions (green), modifications (yellow), removals (red)
- **Change categories**: People, relationships, and attribute changes
- **Severity indicators**: High/medium/low impact badges
- **Interactive**: Click to dismiss and return to canvas

#### Visual Diff
- **Green border**: Added nodes in comparison
- **Red opacity**: Removed nodes
- **Yellow glow**: Modified nodes
- **Change details**: Hover to see what changed

### Usage Examples

#### Creating a Reorganization Scenario
1. Click scenario dropdown → "New Scenario"
2. Name it "Q2 2024 Reorg"
3. Add description and check "Copy from current state"
4. Make changes to the org structure
5. Switch back to original scenario to compare

#### Comparing Scenarios
1. Ensure you have 2+ scenarios
2. Click "Compare Scenarios" button
3. Select scenario to compare against
4. Review diff summary and detailed changes
5. Close comparison to return to editing

## 🔍 Path Finder & Network Analysis

### Path Finder
Discover how any two people are connected through the organization.

#### Features
- **Panel location**: Right side when active
- **Keyboard shortcut**: `P` key
- **Source and target**: Dropdown selectors for any two people
- **Multiple paths**: Shows up to 5 different connection routes
- **Path details**: 
  - Distance (number of hops)
  - Each connection with relationship type
  - Shared dimensions (brands, channels, departments)
- **Visual highlighting**: Click path to highlight on canvas

#### Path Finding Algorithm
- BFS for shortest path
- DFS with depth limit for alternative routes
- Bidirectional edge traversal
- Considers all relationship types

### Network Explorer
Explore the sphere of influence and connections for any person.

#### Features
- **Trigger methods**:
  - Press `E` key with node selected
  - Click "Network" button in editor panel
  - Command palette → "Explore network"
- **Panel location**: Left side when active
- **Network stats**:
  - Total people in network (within 2 hops)
  - Centrality score (0-100%)
  - Direct connection breakdown by type
- **Connection types**:
  - Managers (who they report to)
  - Direct reports (who reports to them)
  - Sponsors
  - Dotted lines
- **Network list**: Shows up to 10 nearby people
- **Quick actions**: Click person to select

#### Network Analysis
- **Sphere of influence**: Configurable depth (default: 2 hops)
- **Centrality calculation**: Normalized degree centrality
- **Bridge nodes**: People connecting different subgraphs
- **Direct connections**: Immediate neighbors with relationship types

### Connection Suggestions
Smart recommendations for creating new relationships.

#### Features
- **Location**: Editor panel below person details
- **Automatic**: Shows when person is selected
- **Suggestion types**:
  - Team members under same manager
  - People with shared brand + channel
  - People with shared department + brand
- **Scoring**: Higher scores for stronger collaboration potential
- **Quick action**: Click + button to add dotted line

#### Suggestion Algorithm
- Analyzes existing connections
- Identifies shared dimensions
- Filters out existing relationships
- Ranks by collaboration score
- Returns top 5 suggestions

### Collaboration Score
Calculates how closely two people should work together:
- **Shared brands**: +0.3 per brand
- **Shared channels**: +0.3 per channel
- **Shared departments**: +0.2 per department
- **Same tier**: +0.1
- **Same location**: +0.1
- **Maximum score**: 1.0

## 🎯 Command Palette Enhancements

New commands added:
- **"Find Path Between People"** - Opens path finder (P)
- **"Explore Network for [person]"** - Opens network explorer (E)
- **Jump to person** with distance indicator when in explorer mode

## ✏️ Inline Card Editor

### Overview
Double-click any person card to open a floating editor directly over the card - no context switching required.

### Features
- **Instant access**: Double-click opens popover at card location
- **All key fields**: Name, title, tier, brands, channels, departments, location, cost center
- **Tag chips**: Click to toggle brands/channels/departments
- **Real-time validation**: 
  - Span of control warnings (High: 9-11, Critical: 12+)
  - Visual indicators with policy guidance
- **Auto-save**: Click outside or press ESC to save and close
- **Smart defaults**: Pre-populated with current values

### Usage
1. Double-click any person card on the canvas
2. Edit fields inline with autocomplete
3. Toggle brand/channel/department chips
4. See span of control status automatically
5. Click outside or press ESC to save

### Benefits
- **No attention switching**: Edit right where you're looking
- **Faster workflow**: Tag 10 people in seconds
- **Immediate feedback**: See policy warnings as you edit
- **Fluid UX**: Stays in flow, no sidebar bounce

## 📊 Span of Control Analytics

### Visual Indicators on Cards
- **Badge on avatar**: Shows direct report count
- **Color coding**:
  - Green (≤8 reports): Healthy
  - Amber (9-11 reports): High - monitor
  - Red (12+ reports): Critical - action needed
- **Hover tooltip**: Shows status and policy guidance

### Analytics Sidebar
- **Trigger**: Click "Analytics" button in bottom-right
- **Summary stats**: Total managers, average span
- **Critical leaders**: List of people with 12+ reports
- **High span leaders**: People with 9-11 reports
- **Distribution chart**: Visual breakdown of span sizes
- **Click to focus**: Select any leader to jump to their card
- **Policy guide**: Reference for span thresholds

### OD Insights
- Identify overextended managers at a glance
- Track organizational health metrics
- Plan reorganizations based on data
- Monitor policy compliance

## 🤖 AI-Powered Org Chart Import

### Overview
Upload screenshots or PDFs of existing org charts and let AI automatically extract people, roles, and reporting relationships.

### Features
- **Supported formats**: PNG, JPG, PDF
- **Drag & drop**: Simple file upload interface
- **AI extraction**: Uses Claude 3.5 Sonnet or GPT-4V
- **Duplicate detection**: Automatically finds existing people by name
- **Smart merging**: Suggests create/update/skip for each person
- **Conflict resolution**: Highlights mismatches (title, location, etc.)
- **Batch import**: Process entire org chart sections at once
- **Confidence scores**: Shows AI certainty for each extraction

### Workflow
1. Click "AI Import" button in toolbar
2. Upload org chart image or PDF
3. AI processes and extracts structure
4. Review suggestions in merge preview
5. Adjust strategies: Create New / Update Existing / Skip Duplicate
6. Click "Apply Changes" to add to canvas
7. AI creates nodes and relationships automatically

### Duplicate Detection
- **Name matching**: Fuzzy comparison handles variations
- **Title similarity**: Detects role changes
- **Location matching**: Cross-references office locations
- **Match scoring**: 0-1 confidence score
- **Manual override**: You control final decision

### API Configuration
Requires one of:
- **Anthropic Claude API** (recommended): https://console.anthropic.com/
- **OpenAI API**: https://platform.openai.com/api-keys

Add key to `.env.local` - works with mock data if no key provided.

## 🎨 Enhanced Edge Visuals

### Line Styles
- **Manager**: Solid line with arrow to manager
- **Sponsor**: Solid line with open diamond at sponsor end
- **Dotted**: Dashed animated line

### Visual Polish
- **No text labels**: Clean, professional appearance
- **Color coding**: Sky blue (manager), amber (sponsor), purple (dotted)
- **Selected state**: 3px width vs 2.5px default
- **Zoom awareness**: Animation disabled at low zoom for performance
- **Interactive legend**: Collapsible panel explaining each type

### Relationship Legend
- **Location**: Top-left of canvas
- **Toggle**: Click header to expand/collapse
- **Visual examples**: SVG previews of each edge type
- **Descriptions**: Clear explanations of relationship meanings
- **Helpful tips**: Right-click to change edge types

## 🔄 Future Enhancements
Potential additions:
- Historical scenario timeline view
- Merge scenarios with conflict resolution
- Bulk selection and batch tagging
- Lens-specific smart layouts (swim lanes, clusters)
- Interactive onboarding tour with coach marks
- Custom template creation
- Collaborative editing mode
- Export scenarios to PowerPoint/PDF
- PDF report generation with analytics


