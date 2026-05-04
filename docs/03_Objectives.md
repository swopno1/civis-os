# Achievable Objectives & KPIs

To track the success of CivisOS development, the following measurable objectives have been established for each phase.

---

## Phase 1 Objectives: Stability & Security
- [x] **100% Offline Boot:** The OS must boot and be fully interactive without any network connection (PWA).
- [x] **Module Isolation:** No module should be able to access the data of another module or the core OS without explicit permission.
- [x] **Zero-Data Loss:** OS state (window positions, theme, installed modules) must persist across refreshes with 99.9% reliability.

## Phase 2 Objectives: Connectivity
- [ ] **LoRa Packet Delivery:** Achieve >90% delivery rate for 256-byte packets between two nodes at a range of 1km in an urban environment.
- [ ] **Seamless Pairing:** A new user should be able to connect their phone/laptop to a hardware mesh node in under 30 seconds.
- [ ] **Traffic Neutrality:** The mesh must successfully route packets without knowing their content (encryption at the routing layer).

## Phase 3 Objectives: Application Utility
- [ ] **Messaging Latency:** Mesh-based messages should be delivered in <5 seconds (local peer) and <1 minute (multi-hop mesh).
- [ ] **Vault Compression:** Critical document storage (PDFs/Images) should utilize efficient compression to fit 100+ documents within the 10MB module quota.
- [ ] **Sync Reliability:** Bulletin board posts should propagate to all connected nodes within 10 minutes of a peer connection.

## Phase 4 Objectives: Hardware Reach
- [ ] **Low-Power Operation:** The "CivisNode" firmware should run on an ESP32 for >24 hours on a standard 18650 battery.
- [ ] **Legacy Support:** The PWA must remain performant (maintain 30fps UI) on devices with as little as 2GB of RAM.

## Phase 5 Objectives: Global Scaling
- [ ] **Language Coverage:** Complete localization for the top 10 global languages and at least 5 regional dialects in crisis-prone areas.
- [ ] **Module Ecosystem:** At least 5 community-developed modules successfully reviewed and signed for distribution.

---

## Micro-Adjustments & Stability (Continuous)
- [ ] **Viewport Boundary Enforcement:** Windows must not be draggable or resizable beyond the visible workspace.
- [ ] **Dynamic Z-Index Normalization:** Ensure z-index values remain within a reasonable range to prevent overflow in long-running sessions.
- [ ] **Resilient Window Resizing:** Implement smooth, performant window resizing with state persistence.
- [ ] **Refined UI Transitions:** Replace non-linear "bouncy" animations with high-stability "ease-out" transitions for better low-power performance.
