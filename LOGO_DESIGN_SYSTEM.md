# ISA Marathon Logo Design System

A comprehensive guide for implementing the ISA Marathon logo across all applications with consistency, accessibility, and responsive design.

## Brand Identity

The ISA Marathon logo represents the Indore Software Association's premier tech-running event. The visual system combines:
- **ISA Logo**: The triangular geometric mark (professional, tech-forward)
- **Marathon Logo**: The running figure icon (dynamic, energetic)

## Color Palette

```css
Primary Colors:
  - Dark Blue (Brand): #1E3A6E, #142850
  - Pink/Magenta: #E91E8C
  - Purple: #9C27B0
  - Cyan/Sky: #2196F3
  - Orange: #FF9800
  - Emerald: #10b981

Neutral/Glass Theme (Admin, Runner, Spectator):
  - White (with opacity): rgba(255, 255, 255, 0.25 - 0.92)
  - Slate-900: #0f172a
  - Slate-800: #1e293b
  - Slate-600: #475569
  - Slate-200: #e2e8f0
```

## Logo Sizes (Responsive)

| Size | Pixels | Usage | Breakpoint |
|------|--------|-------|------------|
| xs   | 24px   | Mobile nav, small badges | sm (640px) |
| sm   | 32px   | Mobile headers | sm (640px) |
| md   | 40px   | Tablet nav, desktop headers | md (768px+) |
| lg   | 48px   | Desktop nav, section headers | lg (1024px+) |
| xl   | 64px   | Large displays, hero sections | xl (1280px+) |
| 2xl  | 80px   | Extra-large displays, banners | 2xl (1536px+) |

**Responsive Strategy:**
```
Mobile (< 640px):  h-6 to h-8  (24-32px)
Tablet (640-1024): h-8 to h-10 (32-40px)
Desktop (1024+):   h-10 to h-16 (40-64px)
Extra Large:       h-16 to h-20 (64-80px)
```

## Logo Layouts

### 1. Horizontal (Default)
**When to use:** Navigation bars, headers, footers
**Spacing:** ISA | divider | Marathon (gap: 0.5rem)
**Applications:** 
  - Admin Panel: Top navigation
  - Public Web: Header
  - All apps: Footer

```tsx
<Logo layout="horizontal" size="md" />
```

### 2. Icon Only
**When to use:** Compact spaces, favicon, loading states, mobile nav
**Size:** xs to md preferred
**Applications:**
  - Runner App: Loading screen
  - Spectator App: Mobile nav toggle
  - All apps: Favicon reference

```tsx
<Logo layout="icon-only" size="sm" />
```

### 3. Icon with Text
**When to use:** Hero sections, brand statements, promotional materials
**Size:** md to xl
**Applications:**
  - Public Web: Hero section
  - Landing pages
  - Marketing emails

```tsx
<Logo layout="icon-with-text" size="lg" />
```

### 4. Vertical (Stacked)
**When to use:** Sidebars, narrow spaces, mobile vertical layouts
**Applications:**
  - Admin Panel: Sidebar (alternative)
  - Mobile layouts
  - Narrow containers

```tsx
<Logo layout="vertical" size="md" />
```

## Application-Specific Implementation

### Admin Panel
- **Header Logo:** Horizontal, md size (h-10)
- **Responsive:** sm to md on tablet, md to lg on desktop
- **Theme:** Light (glassmorphism effect)
- **Placement:**
  - Top left in sidebar (current: already implemented ✓)
  - Top navigation bar
  - Login page (icon-only, sm)

### Public Web
- **Hero Section:** Icon-with-text, lg to xl
- **Header:** Horizontal, md size
- **Footer:** Icon-only, sm size
- **Theme:** Light with colorful gradient background
- **Responsive:** 
  - Mobile: h-8 (32px) - icon-only or vertical
  - Tablet: h-10 (40px) - horizontal
  - Desktop: h-12 (48px) - horizontal

### Runner App
- **Loading State:** Icon-only, sm size (current: already implemented ✓)
- **Header:** Horizontal, sm size
- **Theme:** Dark (for contrast on dark background #0a0f1a)
- **Responsive:** xs to sm on mobile, sm to md on landscape

### Spectator App
- **Header:** Icon-with-text, md to lg (high visibility)
- **Main Display:** Large-format consideration (icon-only possible)
- **Theme:** Optimized for projection/large screens
- **Responsive:** lg to 2xl for visibility from distance

### LED Dashboard
- **Display:** Extra large, 2xl size
- **Layout:** Icon-only or icon-with-text
- **Theme:** Adjustable for venue lighting
- **Performance:** Static, no animation needed

## Responsive Implementation Pattern

```tsx
// Mobile-first approach
<Logo 
  size={isMobile ? 'sm' : isMedium ? 'md' : 'lg'}
  layout={isMobile ? 'icon-only' : 'horizontal'}
  theme={isDarkMode ? 'dark' : 'light'}
/>

// Or using Tailwind breakpoints
<div className="hidden md:block">
  <Logo size="md" layout="horizontal" />
</div>
<div className="md:hidden">
  <Logo size="sm" layout="icon-only" />
</div>
```

## Accessibility Guidelines

1. **Alt Text:** Always provided for screen readers
   - ISA Logo: "ISA - Indore Software Association"
   - Marathon Logo: "Marathon Event"
   - Combined: "ISA Marathon"

2. **Link Usage:** Logo often links to home/dashboard
   ```tsx
   <Logo isLink={true} href="/" />
   ```

3. **Color Contrast:** 
   - Light theme: Sufficient contrast on white/light backgrounds
   - Dark theme: Suitable for dark backgrounds
   - Both: SVG files are scalable without quality loss

4. **Semantic HTML:** 
   - Logo as link uses `<a>` tags
   - Standalone logo uses `<div>` with `role="img"` when appropriate

## Performance Considerations

1. **SVG Format Benefits:**
   - Crisp at any size (no pixelation)
   - Small file size (typically 5-15KB)
   - Can be cached by browser
   - Responsive without media queries

2. **Lazy Loading:**
   - Logos load with page (critical resource)
   - Consider lazy loading in footer logos
   - SVG compression recommended

3. **Caching Strategy:**
   - Logo assets are static
   - Set long cache headers in production
   - Version SVG files if making changes

## Styling Examples

### CSS Classes (For Custom Styling)

```css
/* Logo container styling */
.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-horizontal {
  flex-direction: row;
}

.logo-vertical {
  flex-direction: column;
}

.logo-icon-only {
  width: auto;
  height: auto;
}

.logo-theme-light {
  filter: brightness(1);
}

.logo-theme-dark {
  filter: brightness(0.95);
  opacity: 0.9;
}

/* Responsive sizing */
@media (max-width: 640px) {
  .logo-responsive-sm { height: 24px; }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .logo-responsive-md { height: 32px; }
}

@media (min-width: 1025px) {
  .logo-responsive-lg { height: 48px; }
}
```

### Link Styling

```tsx
// Logo as navigation link (with hover effect)
<Logo 
  isLink={true} 
  href="/"
  className="hover:opacity-75 transition-opacity"
/>
```

## Usage Examples by App

### Admin Panel - Sidebar
```tsx
import { Logo } from '@isa/shared';

<div className="px-5 py-5 border-b border-white/10">
  <Logo 
    layout="horizontal" 
    size="md" 
    theme="light"
    isLink={true}
    href="/dashboard"
  />
</div>
```

### Public Web - Hero
```tsx
<div className="text-center mb-8">
  <Logo 
    layout="icon-with-text"
    size="lg"
    theme="light"
    className="mb-6"
  />
  <h1 className="text-6xl font-black">THE ISA MARATHON</h1>
</div>
```

### Runner App - Loading
```tsx
<div className="flex flex-col items-center gap-3">
  <Logo 
    layout="icon-only" 
    size="sm" 
    theme="dark"
    className="opacity-50"
  />
  <div className="spinner" />
</div>
```

### Spectator App - Header
```tsx
<header className="bg-slate-900 p-4">
  <Logo 
    layout="icon-with-text"
    size="lg"
    theme="dark"
    isLink={true}
  />
</header>
```

## Brand Guidelines - Key Principles

1. **Never distort** the logo - maintain aspect ratio
2. **Minimum size:** 24px (xs) for recognition
3. **Clear space:** At least 0.5rem gap around logo
4. **Single color** when necessary: Use dark blue (#1E3A6E)
5. **No background overlay** unless explicitly designed
6. **Consistent theme:** Match app's color scheme

## Future Enhancements

- [ ] Animated logo variant (loading, celebration)
- [ ] Dark mode SVG variants for perfect contrast
- [ ] Logo animation for hero sections
- [ ] Custom color variants for sponsors
- [ ] 3D logo for WebGL displays (spectator app)
- [ ] Favicon set generated from logo
- [ ] Social media logo crops

## Testing Checklist

- [ ] Logo renders at all sizes (xs, sm, md, lg, xl, 2xl)
- [ ] All layouts work (horizontal, vertical, icon-only, icon-with-text)
- [ ] Responsive breakpoints tested on mobile/tablet/desktop
- [ ] Dark and light themes render correctly
- [ ] Accessibility: Alt text present and meaningful
- [ ] Performance: No console warnings
- [ ] Link functionality works when isLink={true}
- [ ] Logo exports from shared package

## Component Export

```tsx
// From packages/shared/src/index.ts
export { Logo, type LogoProps, type LogoSize, type LogoLayout, type LogoTheme } from './components/Logo';
```

---

**Version:** 1.0  
**Last Updated:** 2026-08-13  
**Owner:** Senior UI/UX Designer
