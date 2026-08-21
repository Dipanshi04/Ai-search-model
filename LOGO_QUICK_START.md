# Logo Component - Quick Start Guide

Fast reference for implementing the ISA Marathon logo across your project.

## Installation

The Logo component is available from the shared package:

```tsx
import { Logo } from '@isa/shared';
```

No additional installation needed - it's part of `@isa/shared`.

## Basic Usage

### Horizontal (Navigation/Headers)
```tsx
<Logo layout="horizontal" size="md" theme="light" isLink={true} href="/" />
```
**Best for:** Navigation bars, sidebars, headers  
**Default:** Most versatile option

### Icon Only (Compact Spaces)
```tsx
<Logo layout="icon-only" size="sm" theme="dark" />
```
**Best for:** Loading screens, mobile nav, tight spaces  
**Sizes:** xs (24px), sm (32px), md (40px)

### Icon with Text (Hero/Marketing)
```tsx
<Logo layout="icon-with-text" size="lg" theme="light" />
```
**Best for:** Hero sections, landing pages, brand statements  
**Sizes:** md (40px), lg (48px), xl (64px)

### Vertical (Sidebars/Narrow Layouts)
```tsx
<Logo layout="vertical" size="md" theme="light" />
```
**Best for:** Narrow containers, mobile vertical layouts  
**Less common:** Use horizontal by default

---

## Size Reference

| Size | Pixels | Use Case | Device |
|------|--------|----------|--------|
| `xs` | 24px | Small badges, mobile nav | Mobile |
| `sm` | 32px | Mobile headers, loading | Mobile |
| `md` | 40px | Default nav, tablets | Tablet |
| `lg` | 48px | Desktop nav, hero sections | Desktop |
| `xl` | 64px | Large displays | Large screens |
| `2xl` | 80px | Extra large displays | Extra large |

**Responsive pattern:**
```tsx
// Mobile: use sm, Desktop: use md
<Logo 
  size={window.innerWidth < 768 ? 'sm' : 'md'}
  layout="horizontal"
  theme="light"
/>
```

---

## Theme Options

### Light Theme (Default)
```tsx
<Logo theme="light" />
```
**Use on:** White/light backgrounds, glass effects  
**Examples:** Admin panel, public web, login pages

### Dark Theme
```tsx
<Logo theme="dark" />
```
**Use on:** Dark backgrounds, dark blue, slate  
**Examples:** Runner app, spectator app, LED dashboard

---

## Layout Breakdown

### `horizontal` (Default)
```
[ISA Logo] | [Marathon Logo]
```
- Width: Auto, expands based on content
- Gap: 8px (0.5rem) between logos
- Best for: Navigation, headers, branding

### `vertical`
```
  [ISA Logo]
[Marathon Logo]
```
- Stacked arrangement
- Gap: 4px (0.25rem) between elements
- Best for: Narrow layouts, mobile menus

### `icon-only`
```
   [Combined Icon]
```
- Single logo image
- Compact, minimal space
- Best for: Loading states, mobile icons

### `icon-with-text`
```
[Combined Icon] ISA MARATHON
```
- Icon + text label
- Strong brand statement
- Best for: Hero sections, marketing

---

## Common Patterns

### Navigation Header
```tsx
<header>
  <Logo 
    layout="horizontal" 
    size="md" 
    theme="light"
    isLink={true}
    href="/"
  />
</header>
```

### Loading Screen
```tsx
<div className="flex flex-col items-center gap-3">
  <Logo 
    layout="icon-only" 
    size="sm" 
    theme="dark"
    className="logo-loading"
  />
  <Spinner />
</div>
```

### Hero Section
```tsx
<section className="text-center">
  <div className="mb-6">
    <Logo 
      layout="icon-with-text" 
      size="lg" 
      theme="light"
    />
  </div>
  <h1>Welcome to ISA Marathon</h1>
</section>
```

### Sidebar
```tsx
<aside className="border-b pb-4 mb-4">
  <Logo 
    layout="horizontal" 
    size="md" 
    theme="light"
    isLink={true}
  />
</aside>
```

### Footer
```tsx
<footer className="py-6 text-center opacity-75">
  <Logo 
    layout="icon-only" 
    size="xs" 
    theme="light"
  />
  <p className="text-sm mt-2">© 2026 ISA Marathon</p>
</footer>
```

---

## CSS Classes for Custom Styling

Add these classes for additional styling:

```tsx
// Animations
<Logo className="logo-fade-in" />
<Logo className="logo-slide-in" />
<Logo className="logo-loading" />  // Pulsing effect

// Interactive
<Logo className="hover:opacity-75 transition-opacity" />

// Glass Effect
<Logo className="logo-glass" />

// Responsive
<Logo className="logo-mobile-only" />   // Show on mobile
<Logo className="logo-desktop-only" />  // Show on desktop
```

---

## Link Functionality

Make logo clickable and link to home:

```tsx
// Links to home (default)
<Logo isLink={true} />

// Links to custom URL
<Logo isLink={true} href="/dashboard" />

// With custom click handler
<Logo 
  isLink={true}
  onClick={() => navigate('/')}
/>
```

---

## Theme Decision Tree

```
Is the background dark?
├─ YES → theme="dark"
└─ NO → theme="light"

Is the space narrow/compact?
├─ YES → layout="icon-only" or "vertical"
└─ NO → layout="horizontal" or "icon-with-text"

Is this a hero/marketing section?
├─ YES → layout="icon-with-text", size="lg"
└─ NO → layout="horizontal", size="md"
```

---

## Performance Tips

1. **Use icon-only for loading states** - smaller footprint
2. **SVGs are cached** - logo files load once then cache
3. **No state management** - component is stateless and lightweight
4. **Lazy load footer logos** - they're non-critical
5. **Avoid unnecessary re-renders** - pass stable props

---

## Troubleshooting

### Logo not showing
- Check if `@isa/shared` is properly exported from index.ts
- Verify logo SVG files exist in `/public` folder
- Check browser console for import errors

### Logo looks blurry
- Increase size if on mobile (minimum 24px)
- SVG should be crisp at any size
- Check if CSS filters are causing issues

### Wrong colors/contrast
- Verify theme prop: `theme="light"` or `theme="dark"`
- Check background color matches theme
- Review LOGO_DESIGN_SYSTEM.md for color guidance

### Responsive issues
- Use size presets instead of custom px values
- Reference responsive strategy in sizing table
- Check CSS media queries in logo.css

---

## Files to Reference

| File | Purpose |
|------|---------|
| `packages/shared/src/components/Logo.tsx` | Component source |
| `packages/shared/src/components/logo.css` | CSS utilities |
| `LOGO_DESIGN_SYSTEM.md` | Complete specifications |
| `LOGO_IMPLEMENTATION_SUMMARY.md` | Project overview |

---

## Questions?

Refer to:
1. **LOGO_DESIGN_SYSTEM.md** - Complete design specifications
2. **Component source** - Inline JSDoc comments
3. **logo.css** - CSS class documentation
4. **Implementation examples** - Check existing app usage

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Aug 13, 2026 | Initial release |

---

**Happy branding! 🏃‍♂️🌿**
