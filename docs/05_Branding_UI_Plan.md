# Branding & UI Strategy (Ultra-Light Design)

CivisOS follows a **"Poor-First, Action-First"** design philosophy. The UI is built for survival, not aesthetics, though clarity and usability are prioritized.

---

## 🎨 1. Visual Identity
- **Name:** CivisOS (Civis = Citizen in Latin).
- **Core Pillars:** Neutrality, Offline-First, Hardware Agnostic, Verifiable.
- **Color Palette:**
    - **Primary:** Deep Black (`#000000`) - Maximizes battery life on OLED screens.
    - **Accent:** High-Contrast Amber or Green (`#00FF00`) - Excellent legibility in low-light and high-glare environments.
    - **Alert:** Survival Orange (`#FF8C00`).

## 🖼️ 2. UI Technical Constraints (Ultra-Light)
To support low-connectivity and low-power devices, we enforce the following rules:
- **No External Assets:** No Google Fonts, no CDN-hosted scripts. Everything is bundled locally.
- **System Fonts Only:** Use `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `Helvetica`, `Arial`, `sans-serif`.
- **Iconography:** Use SVG symbols or CSS-drawn icons. Avoid large PNG/JPG icon sets.
- **CSS-First:** Prioritize CSS transitions over JavaScript animations to reduce CPU load.
- **Logical Properties:** Use `margin-inline-start` instead of `margin-left` for native RTL (Arabic, Hebrew) support without extra code.

## 📱 3. Responsive Design
- **Mobile-First:** The primary interface is designed for 5-inch screens but scales up to 4K desktops.
- **Touch-First:** All interactive elements must have a minimum hit area of 44x44px.
- **Text-Heavy:** Information density is high, but structured for quick scanning in high-stress situations.

## 📡 4. Low-Connectivity Optimizations
- **Progressive Loading:** UI components are prioritized. Large modules are lazy-loaded only when requested.
- **Cache-First Assets:** The Service Worker ensures that once an icon or script is downloaded, it is never requested again unless the OS version changes.
- **Low-Bandwidth Mode:** (Planned) A toggle to disable all non-essential visuals and switch to a purely text-based interface for extreme mesh constraints.
