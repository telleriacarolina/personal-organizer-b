# Planning Guide

A web application that empowers users to design and build their own personalized organizational systems by combining customizable widgets, layouts, and tracking modules into a unified dashboard.

**Experience Qualities**: 
1. **Empowering** - Users should feel in control, with the freedom to craft an organization system that perfectly fits their unique needs and workflow.
2. **Flexible** - The interface should adapt fluidly to different organizational styles, from minimalist daily planners to comprehensive life management systems.
3. **Delightful** - Interactions should feel smooth and satisfying, making the act of organizing genuinely enjoyable rather than a chore.

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This is a complex application because it involves multiple customizable modules (tasks, notes, habits, goals), drag-and-drop functionality, persistent user configurations, and a sophisticated layout system that adapts to user preferences.

## Essential Features

### Widget Library
- **Functionality**: Provides a collection of pre-built organizational modules (tasks, notes, habits, goals, calendar view, quick links) that users can add to their dashboard
- **Purpose**: Gives users building blocks to construct their ideal organizational system
- **Trigger**: User clicks "Add Widget" button or opens widget drawer
- **Progression**: User opens widget library → Browses available widgets → Selects widget type → Widget appears on dashboard → User configures widget settings
- **Success criteria**: Users can browse, preview, and successfully add any widget to their dashboard; widget appears with default settings and is immediately usable

### Task Manager Widget
- **Functionality**: Allows users to create, complete, edit, and delete tasks with priority levels and due dates
- **Purpose**: Central tool for tracking to-dos and managing daily responsibilities
- **Trigger**: User clicks into task widget or "Add Task" button
- **Progression**: User opens task input → Enters task text → (Optional) Sets priority/due date → Saves task → Task appears in list → User can check off, edit, or delete
- **Success criteria**: Tasks persist between sessions, can be marked complete with satisfying animation, and display in clean organized list

### Notes Widget
- **Functionality**: Quick-capture text area for jotting down thoughts, ideas, or information
- **Purpose**: Provides a low-friction space for capturing information without complex structure
- **Trigger**: User clicks into notes widget
- **Progression**: User clicks note widget → Text area activates → User types content → Content auto-saves → User can create multiple notes
- **Success criteria**: Notes save automatically without manual action, support multiple simultaneous notes, and maintain formatting

### Habit Tracker Widget
- **Functionality**: Lets users define habits and track daily completion with visual streak indicators
- **Purpose**: Builds consistency and motivation through visual progress tracking
- **Trigger**: User adds habit tracker widget or clicks "Add Habit"
- **Progression**: User creates habit → Sets habit name → Marks daily completion → Visual streak builds → Celebrates milestones
- **Success criteria**: Habits show clear visual feedback for completion, display current streak count, and reset tracking at midnight

### Dashboard Customization
- **Functionality**: Users can add, remove, resize, and rearrange widgets on their dashboard
- **Purpose**: Enables personalization so each user's organizer reflects their priorities and workflow
- **Trigger**: User enters edit mode or drags widget
- **Progression**: User clicks "Customize" → Widgets become draggable → User repositions/resizes → Clicks "Done" → Layout saves
- **Success criteria**: Layout persists between sessions, feels smooth and intuitive, prevents overlapping or broken layouts

### Theme Personalization
- **Functionality**: Users can select from preset color themes to customize the appearance of their organizer
- **Purpose**: Makes the organizer feel personal and visually appealing to individual preferences
- **Trigger**: User clicks "Customize Theme" button in header
- **Progression**: User opens theme dialog → Previews themes by hovering → Selects preferred theme → Theme applies instantly → Preference saves automatically
- **Success criteria**: Theme changes apply instantly, persist between sessions, maintain readability and accessibility, preview works smoothly on hover

## Edge Case Handling

- **Empty States**: When no widgets are added, display welcoming message with quick-start guide showing how to add first widget
- **Data Loss Prevention**: Auto-save all changes immediately to prevent loss; show subtle save indicator for user confidence
- **Widget Limits**: Gracefully handle maximum widget scenarios with clear messaging and suggestions to archive or delete unused widgets
- **Mobile Responsiveness**: Automatically stack widgets vertically on small screens; disable drag-and-drop in favor of reorder buttons
- **Long Content**: Implement scrolling within widget boundaries; truncate with expand option for very long task names or notes
- **Network Issues**: All data stored locally first; sync indicators if implementing cloud features later

## Design Direction

The design should evoke feelings of calm control, creative freedom, and gentle motivation. It should feel like a premium productivity tool—sophisticated yet approachable, with a warm and inviting aesthetic that makes users want to return daily. The interface should celebrate user progress subtly without being gamified or pushy.

## Color Selection

A warm, sophisticated palette with earthy tones and vibrant accent colors that inspire creativity and focus.

- **Primary Color**: Deep Terracotta `oklch(0.48 0.12 35)` - Grounding and warm, communicates stability and creative energy
- **Secondary Colors**: 
  - Soft Cream `oklch(0.95 0.02 85)` - Gentle background that reduces eye strain
  - Sage Green `oklch(0.72 0.08 145)` - Calming accent for positive actions and completed states
  - Warm Sand `oklch(0.85 0.04 75)` - Muted surfaces for cards and secondary elements
- **Accent Color**: Vibrant Coral `oklch(0.68 0.18 25)` - Energetic highlight for CTAs and important elements, draws attention without overwhelming
- **Foreground/Background Pairings**: 
  - Background Cream (oklch(0.95 0.02 85)): Deep Brown text (oklch(0.25 0.02 35)) - Ratio 11.8:1 ✓
  - Primary Terracotta (oklch(0.48 0.12 35)): White text (oklch(1 0 0)) - Ratio 5.2:1 ✓
  - Accent Coral (oklch(0.68 0.18 25)): Deep Brown text (oklch(0.25 0.02 35)) - Ratio 7.1:1 ✓
  - Card Sand (oklch(0.85 0.04 75)): Deep Brown text (oklch(0.25 0.02 35)) - Ratio 9.3:1 ✓

## Font Selection

Typefaces should balance modern professionalism with approachable warmth, conveying both capability and creativity.

- **Primary Font**: Instrument Sans - A contemporary geometric sans-serif with friendly curves that feels both professional and welcoming
- **Secondary Font**: Space Grotesk - Used sparingly for widget titles and numbers, adds technical precision and visual interest

- **Typographic Hierarchy**: 
  - H1 (Dashboard Title): Instrument Sans Bold/32px/tight letter-spacing (-0.02em)
  - H2 (Widget Titles): Space Grotesk Medium/20px/normal letter-spacing
  - H3 (Section Headers): Instrument Sans Semibold/16px/normal
  - Body (Default Text): Instrument Sans Regular/15px/relaxed line-height (1.6)
  - Small (Metadata): Instrument Sans Regular/13px/muted color
  - Button Text: Instrument Sans Medium/15px/slight letter-spacing (0.01em)

## Animations

Animations should feel organic and purposeful, celebrating user actions while maintaining snappiness. Use subtle spring physics for interactions (task completions, widget movements) to create a responsive, tactile feel. Key moments like completing tasks deserve a micro-celebration (gentle scale + color shift), while layout changes should ease smoothly with 300ms duration. Hover states should respond within 100ms with subtle lift or color transitions. Avoid excessive motion—every animation should either provide feedback, guide attention, or communicate spatial relationships.

## Component Selection

- **Components**: 
  - Card: Primary container for all widgets, using shadow-sm for subtle elevation
  - Button: Primary actions (add widget, save), with variants for secondary actions (edit, delete)
  - Dialog: Widget configuration and settings panels
  - Checkbox: Task completion toggles
  - Input: Task entry, habit names, note titles
  - Textarea: Note content areas
  - Tabs: Switching between dashboard views or widget categories
  - Popover: Quick settings and widget menus
  - Badge: Priority indicators, streak counters
  - ScrollArea: Widget content that may overflow
  - Separator: Visual division between widget sections
  
- **Customizations**: 
  - Custom grid layout system for widget placement (CSS Grid with defined columns)
  - Custom widget header component with consistent title, actions, and drag handle
  - Custom empty state illustrations using SVG patterns
  - Custom streak visualization for habit tracker using progress rings
  
- **States**: 
  - Buttons: Soft shadow on hover, scale down slightly on press, muted when disabled
  - Inputs: Border color shift and subtle glow on focus, error state with red border + shake
  - Cards: Subtle lift on hover when interactive, pulsing border during drag operations
  - Checkboxes: Smooth checkmark animation with color transition, celebratory bounce on complete
  
- **Icon Selection**: 
  - Plus icon: Adding widgets/items
  - X icon: Removing/closing
  - GearSix: Settings and configuration
  - DotsSixVertical: Drag handles
  - Check: Task completion
  - Fire: Habit streaks
  - Note: Notes widget
  - ListChecks: Tasks widget
  - Target: Goals widget
  - Calendar: Calendar view
  
- **Spacing**: 
  - Widget padding: p-6 (24px)
  - Widget gaps: gap-4 (16px) in grid
  - Internal widget spacing: gap-3 (12px) between items
  - Section margins: mb-6 (24px)
  - Tight spacing for lists: gap-2 (8px)
  
- **Mobile**: 
  - Single column layout below 768px
  - Widgets stack vertically with full width
  - Drag handles replaced with reorder buttons
  - Bottom sheet for widget library instead of side drawer
  - Touch-friendly tap targets (minimum 44px)
  - Reduced padding (p-4 instead of p-6)
  - Sticky header for context retention
