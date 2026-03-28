# UI Migration TODO — Tab Story React Sidepanel

> Based on Framer Design Specification
> Theme: Dark, Resolution: 860x1280px

---

## 🛠️ Tech Stack

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "tailwind-variants": "^0.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  },
  "ui": {
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-scroll-area": "^1.0.0",
    "@radix-ui/react-separator": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-tooltip": "^1.0.0"
  },
  "animations": {
    "framer-motion": "^11.0.0"
  },
  "search": {
    "cmdk": "^1.0.0"
  },
  "performance": {
    "@tanstack/react-virtual": "^3.0.0"
  },
  "drag-drop": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.0"
  },
  "state": {
    "zustand": "^4.5.0"
  },
  "icons": {
    "lucide-react": "^0.344.0"
  }
}
```

### Package Purposes

| Package | Purpose |
|---------|---------|
| **tailwindcss** | Utility-first CSS framework |
| **tailwind-variants** | Variant-based component styling (class variants) |
| **@radix-ui/\*** | Unstyled, accessible UI primitives |
| **framer-motion** | Production-ready motion/animations |
| **cmdk** | Command palette / search UI |
| **@tanstack/react-virtual** | Virtual scrolling for performance |
| **@dnd-kit/sortable** | Drag & drop functionality |
| **zustand** | Lightweight state management |
| **lucide-react** | Beautiful icon library |

---

## 📐 Layout Structure

### Canvas & Layout
- [ ] Two-panel layout (Sidebar 240px | Main ~620px)
- [ ] No border between panels - seamless blend
- [ ] Background: #0E0E10 (near-black)
- [ ] Sidebar background: #13131A

---

## 🔝 Top Header Bar

**Dimensions:** Full width, height 64px, background #13131A
**Border:** 1px solid rgba(255,255,255,0.06)

### Left Side
- [ ] App icon: 36x36px rounded square with dark purple/navy gradient
- [ ] Icon design: browser tab grid pattern (use Lucide icon)
- [ ] Text "Tab Story": white, weight 700, size 18px, letter-spacing -0.3px
- [ ] Font: Inter (via Tailwind default)

### Right Side - Icon Group
- [ ] Three 36x36px circular icon buttons (8px gap, right-aligned)
- [ ] Button style: `bg-white/6 hover:bg-white/12 rounded-full border border-white/8`
- [ ] Icons from Lucide (stroke, white, 70% opacity):
  - [ ] `<Search />` - search
  - [ ] `<Clock />` - history
  - [ ] `<Settings />` - settings

---

## 🗂️ Left Sidebar Panel

**Dimensions:** Width 240px, full height, background #13131A
**Padding:** `px-3 py-2`
**Behavior:** Scrollable via `@radix-ui/react-scroll-area`

### Row 1 - "New Intent" Button
- [ ] Height 40px, full width
- [ ] Left: `<Plus />` icon 18px, color `#7C6FFF`
- [ ] Text: "New Intent" - `text-white font-semibold text-sm`
- [ ] Right: `<ChevronDown />` icon, white/50
- [ ] Hover: `hover:bg-white/5 rounded-lg`
- [ ] Use `tailwind-variants` for states

### Row 2 - "Everything"
- [ ] List icon `<List />` on left, 16px, gray
- [ ] Text: "Everything" - `text-[#A0A0B0] text-xs font-medium`
- [ ] No background, no border

### Folder Tree Section
**Folder Item Component** (reusable with `tailwind-variants`):
- [ ] Height 36px, full width
- [ ] Left: `<Folder />` icon 16px (colored via Lucide prop)
- [ ] Text: folder name, `text-white text-xs font-medium`
- [ ] Right: `<ChevronDown />` / `<ChevronRight />` expand/collapse, `text-white/40`
- [ ] Indent level 1: `pl-3`
- [ ] Indent level 2: `pl-7`
- [ ] Active/selected state: `bg-white/7 rounded-lg`

**Folders structure:**
```
📁 Development  [expanded]
  ↳ 📁 Android [selected, bg-white/9]
     ↳ 📁 Backend
📁 Opensox [collapsed]
  ↳ + Add Tab (dashed, opacity-50 text-[#A0A0B0] text-xs)
```

### Tags Section (appears twice - once per workspace)

**Section Header:**
- [ ] Icon: `<Tags />` from Lucide, gray
- [ ] Text: "Tags" - `text-white text-xs font-semibold`

**Tag Chips Row:**
- [ ] Horizontal flex-wrap layout
- [ ] Tag pill: `h-6 px-2.5 rounded-full bg-white/6 border border-white/10`
- [ ] Tag text: `text-[10px] text-[#C0C0D0] font-medium`
- [ ] Tags: "#GSoC", "#UI", "#urgent"
- [ ] Use `tailwind-variants` for chip states

**"+ Manage Tags" link:**
- [ ] Small text, `text-[11px] text-[#7C6FFF] underline`
- [ ] Padding-top `pt-1`

### Second Workspace
**Repeat structure with:**
- [ ] 📁 Opensox
- [ ] 📁 Graft (with `<MoreHorizontal />` icon before folder)
- [ ] Tags section repeated with same chips

### Bottom Status Bar
- [ ] Fixed to bottom, height 44px
- [ ] Border-top: `border-t border-white/6`
- [ ] Horizontal row with icons + text, `text-[11px] text-[#808090]`
- [ ] Items: "26 tabs", "22 folders", "8s", "154.21 KB"
- [ ] "+ Add Tab" button: `pill bg-[#7C6FFF] text-white text-xs font-semibold rounded-full px-3.5 py-1.5`
- [ ] Green dot `●` with number "5"

---

## 🔍 Main Panel - Top Search Bar

**Use `cmdk` for command palette search**

**Dimensions:** Full width of main panel, height 56px
**Style:**
- [ ] `bg-white/4 border border-white/8 rounded-xl mt-3 mx-4`
- [ ] Left: `<Search />` icon, gray, 18px, `ml-4`
- [ ] Placeholder: "Search for tabs, domains, tags..." - `text-[#606070] text-sm italic`
- [ ] Focus state: `focus:border-[#7C6FFF]/50` - purple glow

### Filter Chips Row
- [ ] Horizontal row, `gap-2 mt-2.5 ml-4`
- [ ] Chip style: `h-7.5 rounded-full px-3 border border-white/12 text-xs font-medium`
- [ ] Use `tailwind-variants` for active/inactive states

**Chips:**
1. **"Research"**
   - [ ] Left icon: `<Search />` with circle
   - [ ] `bg-white/6 text-[#C0C0D0]`

2. **"Study"** [ACTIVE/SELECTED]
   - [ ] `bg-[#2A6F4F] text-[#5DDFB0] border-transparent`
   - [ ] Left dot: green circle `●`

3. **"To-Do"**
   - [ ] `bg-white/6`
   - [ ] Left dot: amber circle `● text-[#D4A832]`

---

## 📋 Main Panel - Tab List Content

**Scrollable area** below search bar, `px-0`
**Use `@tanstack/react-virtual` for virtualized tab list**

### Time Section Headers
- [ ] Labels: "TODAY", "YESTERDAY", "THIS WEEK", "OLDER"
- [ ] Style: `text-[11px] font-bold tracking-widest text-[#505060] uppercase py-4 pb-2`

### Group Card Component
- [ ] `bg-[#1A1A24] rounded-xl p-3.5 mb-3 border border-white/6`
- [ ] Use `@radix-ui/react-collapsible` for expand/collapse

**Group header row:**
- [ ] Left: favicon/icon 28x28px, `rounded-lg`
- [ ] Group name: `text-white text-base font-semibold`
- [ ] Right: `<MoreHorizontal />` icon, `text-[#606070]`

**Tab row inside group:**
- [ ] Height 44px, flex row
- [ ] Indent ~8px from group name
- [ ] Left: favicon 24x24px, `rounded-md`
- [ ] Title: `text-white text-xs font-medium max-w-60 truncate`
- [ ] Domain below title: `text-[11px] text-[#606070]`
- [ ] Tag chips: pill style, `text-[10px]`
- [ ] Status badge (right): pill, `h-5 text-[10px] font-bold rounded-full`

**Status types:**
- [ ] "To Explore": `bg-[#D4A832]/15 text-[#D4A832]` with orange dot ●
- [ ] "In Progress": `bg-[#5B9CF6]/15 text-[#5B9CF6]` with blue dot ●
- [ ] "Done": `bg-[#50C878]/15 text-[#50C878]` with green dot ●
- [ ] Date text: `text-[11px] text-[#505060] ml-auto`

**Separator:**
- [ ] `border-b border-white/4 ml-8`

---

## 🪟 Hover Popup / Tab Detail Card

**Use `@radix-ui/react-popover` for positioning**

**Position:** Absolute, floating
**Dimensions:** Width 310px, `rounded-2xl`
**Style:**
- [ ] `bg-[#1E1E2A] border border-white/12 shadow-[0_16px_48px_rgba(0,0,0,0.6)]`

### Header Row
- [ ] Padding `p-3.5 pb-2.5`
- [ ] Left: favicon 28x28px, `rounded-lg`
- [ ] Title: `text-white text-xs font-semibold`
- [ ] Right: two icon buttons `<Circle />` `<ArrowRight />`, gray, 18px each

### Sub-row
- [ ] Domain: `text-[#11px] text-gray-400`
- [ ] Tag chip: "#GiSced" - pill style

### Preview Image Section
- [ ] Blurred screenshot thumbnail, `h-20 rounded-lg mx-2.5 mb-2.5`
- [ ] 3 lines tiny text overlay, `text-[8px] text-white/50`
- [ ] Text: "Inspirational ideas and tips for contributing @ GSoC42..."

### Action Buttons Row
- [ ] Bottom, padding `p-2.5 px-3.5`
- [ ] 3 buttons equally spaced:
  - [ ] "▶ Open" - `<Play />` + text, `bg-white/8 rounded-lg h-8 px-3 text-xs text-white`
  - [ ] "🔗 Share" - `<Share />` - same style
  - [ ] "📋 Move" - `<Move />` - same style
- [ ] Hover: `hover:bg-white/14`

---

## 🎨 Global Design Tokens

### Tailwind Config (`tailwind.config.js`)

```js
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          base: '#0E0E10',
          elevated: '#1A1A24',
          sidebar: '#13131A',
          popup: '#1E1E2A',
        },
        accent: {
          purple: '#7C6FFF',
          green: '#50C878',
          'green-light': '#5DDFB0',
          'green-dark': '#2A6F4F',
          blue: '#5B9CF6',
          amber: '#D4A832',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0B0',
          muted: '#505060',
          placeholder: '#606070',
        },
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          default: 'rgba(255,255,255,0.10)',
          focus: 'rgba(124,111,255,0.5)',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.4)',
        popup: '0 16px 48px rgba(0,0,0,0.6)',
        subtle: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
```

### Typography
- [ ] Font: Inter (weights 400, 500, 600, 700) via Tailwind default
- [ ] Base size: 13px → `text-[13px]`
- [ ] Line height: 1.5 → `leading-relaxed`

### Radius (Tailwind classes)
- [ ] sm: 6px → `rounded-md`
- [ ] md: 10px → `rounded-lg`
- [ ] lg: 14px → `rounded-xl`
- [ ] pill: 999px → `rounded-full`

### Spacing System
- [ ] Base unit: 4px
- [ ] Scale: 1, 2, 3, 4, 6, 8 (maps to 4, 8, 12, 16, 24, 32px)

---

## ⚡ Interactions & Animations (Framer Motion)

- [ ] Sidebar folder rows: `AnimatePresence` for expand/collapse, chevron rotation (200ms ease)
- [ ] Tab rows: `whileHover={{ bg: 'rgba(255,255,255,0.04)' }}` transition 150ms
- [ ] Tab row click → popup card with spring animation:
  ```jsx
  <motion.div
    initial={{ scale: 0.92, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', duration: 0.3 }}
  />
  ```
- [ ] Filter chips: `layout` prop for color transition 200ms
- [ ] Search bar: `focus` state with purple glow via Tailwind
- [ ] Status badge hover → `@radix-ui/react-tooltip` with full label
- [ ] "Add Tab" button: `whileHover={{ scale: 1.03 }}` with glow

---

## 📦 React Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx          # Left sidebar panel
│   │   ├── Header.jsx           # Top header bar
│   │   └── MainPanel.jsx        # Right main content
│   ├── sidebar/
│   │   ├── NewIntentButton.jsx  # New intent button
│   │   ├── FolderItem.jsx       # Folder item with variants
│   │   ├── FolderTree.jsx       # Folder tree component
│   │   ├── TagsSection.jsx      # Tags section
│   │   └── StatusBar.jsx        # Bottom status bar
│   ├── main/
│   │   ├── SearchBar.jsx       # CMDK search
│   │   ├── FilterChips.jsx     # Filter chips with variants
│   │   ├── TimeSectionHeader.jsx # Time headers
│   │   ├── GroupCard.jsx       # Tab group card
│   │   ├── TabRow.jsx          # Individual tab row
│   │   └── TabList.jsx         # Virtualized tab list
│   ├── popup/
│   │   └── TabDetailPopup.jsx  # Radix popover + Framer motion
│   └── ui/
│       ├── Button.jsx          # Button with tailwind-variants
│       ├── Chip.jsx            # Chip component
│       └── Badge.jsx           # Status badge
├── store/
│   └── useTabStore.js          # Zustand store for tabs
├── hooks/
│   ├── useTabData.js
│   ├── useFolderState.js
│   └── usePopupState.js
├── lib/
│   ├── utils.js                # Utility functions
│   └── cn.js                   # clsx + tailwind-merge
├── App.jsx
├── main.jsx
└── index.css
```

---

## ✅ Implementation Priority

### Phase 0: Setup (Day 1-2)
- [ ] Install all dependencies
- [ ] Configure Tailwind CSS with design tokens
- [ ] Set up `tailwind-variants` and `cn.js` utility
- [ ] Configure PostCSS and Vite
- [ ] Create Zustand store structure

### Phase 1: Foundation (Week 1)
- [ ] Create layout components (Sidebar, Header, MainPanel)
- [ ] Setup basic grid/flex layouts
- [ ] Import and configure Lucide icons
- [ ] Create reusable UI primitives (Button, Chip, Badge)

### Phase 2: Sidebar (Week 1-2)
- [ ] New Intent button with variants
- [ ] Folder tree with expand/collapse (Framer Motion)
- [ ] Tags section with chips
- [ ] Status bar

### Phase 3: Main Panel (Week 2-3)
- [ ] CMDK search bar with focus states
- [ ] Filter chips with variants
- [ ] Time section headers
- [ ] Group cards with Radix collapsible
- [ ] Tab rows with hover states
- [ ] Virtualized tab list (@tanstack/react-virtual)

### Phase 4: Interactions (Week 3)
- [ ] Hover states with Framer Motion
- [ ] Tab detail popup (Radix Popover)
- [ ] Smooth transitions and animations
- [ ] Drag & drop for tabs (@dnd-kit)

### Phase 5: Chrome Integration (Week 4+)
- [ ] Connect to Chrome Storage API
- [ ] Real-time tab data sync via Zustand
- [ ] Intent capture flow
- [ ] Grouping logic
- [ ] Background script messaging

---

## 📦 Installation Commands

```bash
# Core dependencies
npm install react react-dom

# Styling
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate tailwind-variants

# UI Primitives
npm install @radix-ui/react-dialog \
            @radix-ui/react-dropdown-menu \
            @radix-ui/react-popover \
            @radix-ui/react-scroll-area \
            @radix-ui/react-separator \
            @radix-ui/react-slot \
            @radix-ui/react-tooltip

# Animations
npm install framer-motion

# Search
npm install cmdk

# Performance
npm install @tanstack/react-virtual

# Drag & Drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# State
npm install zustand

# Icons
npm install lucide-react

# Build
npm install -D @vitejs/plugin-react vite
```

---

*Last updated: March 28, 2026*
*Design Reference: Framer Design Specification*
