# Design Guidelines: KETMAR Market - Matrix-Neon Cyberpunk Edition

## Design Approach

**System**: Cyber-Minimalism × Matrix × iOS-Neon UI  
**Interface**: Telegram MiniApp with Server-Driven UI + Web Admin Panel  
**Aesthetic**: Dark futuristic marketplace with glassmorphism, neon glows, and clean grids

---

## Color System

### Dark Foundation
- `--bg-base`: `#000000` - Pure black base
- `--bg-elevated`: `#0A0F1A` - Dark navy panels
- `--bg-glass`: `rgba(10, 15, 26, 0.6)` - Glassmorphic surfaces
- `--bg-glass-heavy`: `rgba(10, 15, 26, 0.85)` - Stronger glass panels

### Neon Accents
- `--neon-blue`: `#3B82F6` - Primary electric blue
- `--neon-purple`: `#7C3AED` - Secondary purple
- `--neon-cyan`: `#06B6D4` - Tertiary accent
- `--neon-pink`: `#EC4899` - Special highlights

### Text Colors
- `--text-primary`: `#F8FAFC` - Primary white text
- `--text-secondary`: `#94A3B8` - Muted slate
- `--text-tertiary`: `#64748B` - Subtle gray
- `--text-neon`: `#3B82F6` - Glowing blue text

### Glow Effects
- `--glow-blue`: `0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2)`
- `--glow-purple`: `0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(124, 58, 237, 0.2)`
- `--glow-subtle`: `0 0 10px rgba(59, 130, 246, 0.3)`

---

## Typography

**Primary Font**: Inter (700-900 weights for headings, 400-600 for body)  
**Accent Font**: JetBrains Mono (monospace for labels, badges, codes)

**Hierarchy:**
- H1: `clamp(2rem, 4vw, 3rem)` - 900 weight - `--text-primary` with subtle glow
- H2: `clamp(1.5rem, 3vw, 2rem)` - 800 weight - `--text-primary`
- H3: `1.25rem` - 700 weight - `--text-secondary`
- Body: `1rem` - 400 weight - `--text-secondary`
- Small: `0.875rem` - 500 weight - `--text-tertiary`
- Label: `0.75rem` - JetBrains Mono - 600 weight - `--neon-blue`

---

## Layout System

**Spacing Units** (8px base):
- xs: `4px`
- sm: `8px`
- md: `16px`
- lg: `24px`
- xl: `32px`
- 2xl: `48px`
- 3xl: `64px`

**Generous Padding**: Use lg-3xl spacing between major sections for breathing room

**Container:**
- MiniApp: Full-width, padding `clamp(20px, 4vw, 32px)`
- Max-width: `1200px` for admin panel
- Bottom padding: `140px` for navigation clearance

**Border Radius:**
- sm: `8px` - Badges
- md: `16px` - Cards, buttons
- lg: `24px` - Major panels
- xl: `32px` - Hero sections

---

## Component Design

### Glassmorphic Cards
- Background: `rgba(10, 15, 26, 0.6)`
- Backdrop filter: `blur(20px) saturate(180%)`
- Border: `1px solid rgba(59, 130, 246, 0.2)` (glowing outline)
- Box shadow: `--glow-subtle`
- Radius: `16px`
- Hover: Intensify glow + `border: 1px solid rgba(59, 130, 246, 0.4)`

### Buttons

**Primary (Neon):**
- Background: `linear-gradient(135deg, #3B82F6, #7C3AED)`
- Text: `#FFFFFF` - 700 weight
- Padding: `14px 28px`
- Radius: `12px`
- Glow: `--glow-blue`
- Hover: Intensify glow

**Secondary (Ghost Glass):**
- Background: `rgba(59, 130, 246, 0.1)`
- Border: `1px solid rgba(59, 130, 246, 0.3)`
- Text: `--neon-blue` - 600 weight
- Backdrop filter: `blur(10px)`
- Hover: `background: rgba(59, 130, 246, 0.2)`

**Hero Buttons (on images):**
- Background: `rgba(10, 15, 26, 0.7)`
- Backdrop filter: `blur(20px)`
- Border: `1px solid rgba(59, 130, 246, 0.5)`
- No hover effects needed

### Input Fields
- Background: `rgba(10, 15, 26, 0.8)`
- Border: `1px solid rgba(59, 130, 246, 0.2)`
- Radius: `12px`
- Padding: `14px`
- Focus: Border glow `rgba(59, 130, 246, 0.6)` + `--glow-subtle`
- Text: `--text-primary`

### Badges & Pills
- Background: `rgba(59, 130, 246, 0.15)`
- Border: `1px solid rgba(59, 130, 246, 0.4)`
- Font: JetBrains Mono - `0.75rem` - 700 weight
- Padding: `6px 12px`
- Radius: `999px`
- Glow: Subtle neon outline

---

## Telegram MiniApp Blocks

### Hero Banner
- Full-width gradient overlay on image
- Gradient: `linear-gradient(180deg, rgba(0,0,0,0.3), rgba(10,15,26,0.9))`
- Title: H1 with `text-shadow: 0 0 30px rgba(59, 130, 246, 0.8)`
- CTA buttons with glass blur effect

### Category Grid
- 3-column grid (mobile: 2-column)
- Glass cards with neon borders
- Icon + label layout
- Hover: Lift effect + glow intensify

### Product Cards
- Glass card with 1:1 product image
- Thin laser border: `1px solid rgba(59, 130, 246, 0.15)`
- Price in neon blue with monospace font
- Seller badge with purple accent
- Subtle noise texture overlay

### Map Block
- Dark theme map with neon pin markers
- Glass overlay controls
- Location cards with glassmorphism

### Bottom Navigation
- Fixed, 72px height
- Background: `rgba(10, 15, 26, 0.95)`
- Backdrop filter: `blur(30px)`
- Top border: `1px solid rgba(59, 130, 246, 0.2)` with glow
- Active icons: Neon blue with glow effect

---

## Effects & Textures

### Matrix Noise
- Apply subtle grain: `background-image: url('data:image/svg+xml,...')` with 2% opacity noise
- Alternative: CSS `filter: contrast(1.05) brightness(1.02)`

### Gradients
- Use blurred radial gradients behind key sections
- Example: `radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1), transparent 70%)`

### Laser Lines
- Thin separator lines: `1px solid rgba(59, 130, 246, 0.15)`
- Use sparingly between major sections
- Add subtle glow: `box-shadow: 0 0 5px rgba(59, 130, 246, 0.2)`

---

## Animations

**Duration:**
- Micro: `150ms`
- Standard: `300ms`
- Smooth: `cubic-bezier(0.4, 0, 0.2, 1)`

**Interactions:**
- Hover: Glow intensification (no color shift)
- Focus: Border glow animation
- Cards: Subtle `translateY(-3px)` on hover
- No scroll animations (performance)

---

## Images

### Hero Section
Use dramatic product/lifestyle photography with dark overlays:
- Placement: Full-width hero banner at top
- Overlay: Dark gradient from top to bottom
- Treatment: Slight desaturation + contrast boost for cyber aesthetic
- Size: ~800x400px (16:9 or 2:1 aspect ratio)

### Product Images
- 1:1 square format
- Clean product shots on dark or transparent backgrounds
- Subtle cyan/blue rim lighting enhancement in post

### Category Icons
- Neon-outlined vector icons (SVG)
- Glowing effect on active state

---

## Logo Integration

**Logo Variants:**
- Use `ketmar_sign_rgb.svg` for app icon (48x48px) with added neon glow
- Use `ketmar_logo_rgb.svg` in header with CSS glow filter
- Monochrome variants not suitable for this theme

**Glow Enhancement:**
```
filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.6));
```

---

## Accessibility

- Touch targets: 48x48px minimum
- Contrast: Ensure neon text on dark backgrounds meets WCAG AA (check with tools)
- Focus states: Neon border glow (clearly visible)
- Reduced motion: Disable glows/animations for `prefers-reduced-motion`

---

## Key Principles

1. **Cyber Minimalism**: Clean layouts with intentional neon accents
2. **Glassmorphism First**: All panels use glass blur effects
3. **Generous Spacing**: Large gaps create premium feel
4. **Glowing Interaction**: Every interactive element glows on focus/hover
5. **Dark Foundation**: Pure black base with navy elevations
6. **Typography Contrast**: Bold headings vs. refined body text
7. **Performance**: Optimize blur filters, use transform for animations