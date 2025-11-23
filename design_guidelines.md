# Design Guidelines: KETMAR Market

## Design Approach

**System Selection**: Modern Neutral Design System
**Primary Interface**: Telegram MiniApp with Server-Driven UI
**Secondary Interface**: Web admin panel for marketplace management

**Justification**: Contemporary neutral palette provides professional appearance, excellent readability, and timeless aesthetic perfect for marketplace applications. Emphasis on content over decoration.

---

## Color System

### Neutral Professional Palette

**Primary Colors:**
- `--color-primary`: `#0f172a` (Slate 900) - Primary text, headers
- `--color-primary-light`: `#1e293b` (Slate 800) - Interactive elements
- `--color-primary-soft`: `#334155` (Slate 700) - Secondary elements

**Secondary Colors:**
- `--color-secondary`: `#64748b` (Slate 500) - Secondary text
- `--color-secondary-light`: `--color-text-muted`: `#94a3b8` (Slate 400) - Muted text
- `--color-secondary-soft`: `#cbd5e1` (Slate 300) - Borders

**Accent Colors:**
- `--color-accent`: `#475569` (Slate 600) - Subtle accents
- `--color-accent-warm`: `#78716c` (Stone 500) - Warm accents
- `--color-accent-highlight`: `#3b82f6` (Blue 500) - Important CTAs only

**Background Colors:**
- `--bg-primary`: `#ffffff` - Main background
- `--bg-secondary`: `#f8fafc` (Slate 50) - Alternate sections
- `--bg-tertiary`: `#f1f5f9` (Slate 100) - Cards, containers
- `--bg-elevated`: `#ffffff` - Elevated cards with shadow

**Semantic Colors:**
- `--color-success`: `#10b981` (Emerald 500)
- `--color-success-bg`: `#d1fae5` (Emerald 100)
- `--color-warning`: `#f59e0b` (Amber 500)
- `--color-warning-bg`: `#fef3c7` (Amber 100)
- `--color-error`: `#ef4444` (Red 500)
- `--color-error-bg`: `#fee2e2` (Red 100)
- `--color-info`: `#6366f1` (Indigo 500)
- `--color-info-bg`: `#e0e7ff` (Indigo 100)

### Dark Mode Support
*Planned for future implementation - Telegram theme integration*

---

## Typography

**Primary Font**: Inter (Google Fonts)
- Modern, highly legible geometric sans-serif
- Excellent at small sizes for mobile

**Hierarchy:**
- **Headings**: 600-700 weight, Slate 900
- **Body**: 400-500 weight, Slate 700
- **Metadata**: 400 weight, Slate 500
- **Muted**: 400 weight, Slate 400

**Size Scale:**
- H1: `clamp(1.5rem, 2.5vw, 2rem)` (24-32px)
- H2: `clamp(1.25rem, 2vw, 1.5rem)` (20-24px)
- H3: `1.125rem` (18px)
- Body: `1rem` (16px)
- Small: `0.875rem` (14px)
- Tiny: `0.75rem` (12px)

---

## Layout System

**Spacing Units**: Consistent 4px-based scale
- Micro: `4px`
- Small: `8px`
- Medium: `12px`
- Base: `16px`
- Large: `24px`
- XL: `32px`

**Container Strategy:**
- MiniApp: Full-width with horizontal padding `clamp(16px, 3vw, 28px)`
- Cards: `16px` padding
- Bottom padding: `120px` to account for tab navigation
- Max width: `1200px` for wide screens

**Border Radius:**
- Small: `8px` - Buttons, small cards
- Medium: `12px` - Input fields, standard cards
- Large: `16px` - Major containers
- XL: `18px` - Feature sections
- Full: `999px` - Pills, badges

---

## Component Design

### Cards
- Background: `#ffffff`
- Border: `1px solid #e2e8f0` (optional)
- Shadow: `0 2px 8px rgba(15, 23, 42, 0.06)` (subtle)
- Hover: `0 4px 16px rgba(15, 23, 42, 0.1)` (elevation)
- Radius: `16px`

### Buttons
**Primary:**
- Background: `#0f172a` (Slate 900)
- Text: `#ffffff`
- Padding: `12px 20px`
- Radius: `12px`
- Hover: `#1e293b` (Slate 800)

**Secondary:**
- Background: `#f1f5f9` (Slate 100)
- Text: `#0f172a` (Slate 900)
- Border: `1px solid #cbd5e1` (optional)
- Hover: `#e2e8f0` (Slate 200)

**Ghost:**
- Background: `transparent`
- Text: `#475569` (Slate 600)
- Hover: `#f8fafc` (Slate 50)

### Input Fields
- Border: `1px solid #cbd5e1` (Slate 300)
- Background: `#ffffff`
- Radius: `12px`
- Padding: `12px`
- Focus: `2px solid #3b82f6` (Blue 500) outline

### Badges & Pills
- Padding: `4px 10px`
- Radius: `999px` (full pill)
- Background: `rgba(71, 85, 105, 0.1)` with matching text color
- Font size: `0.75rem` (12px)
- Font weight: 600

---

## Telegram MiniApp Design

### Server-Driven UI Blocks

**Block Types:**
1. **Hero Banner** - Full-width image with title overlay
2. **Category Grid** - 2-3 column grid with icons
3. **Ad Carousel** - Horizontal scroll of product cards
4. **Promo Banner** - Seasonal/event promotional block
5. **Map Block** - Geolocation-based content
6. **Content Slot** - Flexible content from CMS

**Layout Principles:**
- Blocks render vertically in order
- Each block has consistent 16px horizontal padding
- Vertical spacing: 16-24px between blocks
- Responsive grid for category/product displays

### Bottom Navigation
- Fixed position, 64px height
- Background: `#ffffff` with top border
- Icons: Lucide React, 24px size
- Active state: Slate 900 text, subtle background
- Inactive: Slate 400 text

---

## Web Admin Panel Design

### Dashboard
- Sidebar: `w-64`, fixed left, Slate 50 background
- Main content: Max-width `1200px`, centered
- Stats cards: 4-column grid on desktop, stacked mobile
- Tables: Striped rows, hover states

### Forms
- Two-column layout on desktop
- Generous padding and spacing
- Clear labels above inputs
- Validation states with colored borders

---

## Shadows & Elevation

**Elevation Scale:**
- Level 0 (flat): No shadow
- Level 1 (subtle): `0 2px 8px rgba(15, 23, 42, 0.06)`
- Level 2 (card): `0 4px 16px rgba(15, 23, 42, 0.1)`
- Level 3 (modal): `0 20px 40px rgba(15, 23, 42, 0.2)`

---

## Animations

**Transitions:**
- Duration: `150ms` for micro-interactions
- Duration: `250ms` for larger movements
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)

**Hover States:**
- Buttons: Slight background color change
- Cards: Subtle elevation increase (`translateY(-2px)`)
- Links: Color shift to primary

**No scroll-triggered animations** - Performance priority

---

## Images & Media

### Product Images
- Aspect ratio: 1:1 (square) or 4:3
- Quality: WebP format, lazy loading
- Placeholder: Neutral gray background with icon

### Category Icons
- WebP format, optimized
- Size: Variable based on hierarchy
- Lazy loading enabled
- Async decoding

---

## Accessibility

- Minimum touch target: 44x44px
- Color contrast: WCAG AA minimum (4.5:1)
- Focus indicators: Visible 2px outline
- Keyboard navigation: Full support in web admin

---

## Key Design Principles

1. **Content First**: Minimal chrome, maximum content visibility
2. **Performance**: Optimized images, lazy loading, code splitting
3. **Consistency**: Unified spacing, typography, color usage
4. **Clarity**: Clear hierarchy, obvious interactive elements
5. **Professionalism**: Neutral palette conveys trust and reliability
6. **Mobile Optimized**: Thumb-friendly targets, optimized layouts
7. **Future-Proof**: Timeless neutral palette won't feel dated

---

## Logo Integration

*Pending: Awaiting logo files to generate variants*

Once logos are provided, will create:
- Full horizontal logo
- Compact icon version
- Favicon (32x32, 64x64, 128x128)
- App icon (1024x1024)
- MiniApp icon (512x512)
- Splash screen graphic
