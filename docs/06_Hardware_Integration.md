# CivisOS Hardware Integration Strategy (Phase 4)

This document outlines the architecture for broadening CivisOS hardware support, increasing performance via native components, and preparing for open-source hardware (RISC-V).

## 1. Native Wrappers (Electron/Capacitor)
While CivisOS is "Web-First," native wrappers provide critical advantages:
- **Direct Hardware Access:** Circumventing browser limitations for Serial, Bluetooth, and Filesystem APIs.
- **Background Processes:** Running mesh routing logic even when the window is closed.
- **Distribution:** Traditional installers for Windows, macOS, and Linux.

**Location:** `native/electron/`

## 2. CivisNode (Headless Mesh Router)
A "CivisNode" is an ESP32-based device that acts as the physical backbone of the mesh network.
- **WiFi AP:** Serves the CivisOS PWA to nearby devices (phones, laptops) without internet.
- **Mesh Bridge:** Bridges local device traffic to the LoRa/Radio mesh network.
- **Persistence:** High-availability node that stays powered on (solar/battery) to maintain network integrity.

**Location:** `firmware/civisnode/`

## 3. WASM Core & RISC-V Optimization
Performance-critical tasks (cryptography, routing, packet validation) are being moved to a Rust-based WASM core.
- **Neutrality:** Rust provides a highly auditable and safe environment for core logic.
- **RISC-V Ready:** Rust's excellent support for RISC-V targets ensures that CivisOS can run natively on emerging sovereign hardware (e.g., StarFive, Milk-V).
- **Auditability:** Core logic is decoupled from the UI, making it easier to verify and port to different environments.

**Location:** `wasm/core/`

## 4. Integration Path
1. **Bridge Protocol:** Standardize the JSON-RPC or Protobuf protocol used between the Frontend (PWA), Native Wrapper, and CivisNode.
2. **Unified Core:** Compile the `wasm/core` Rust logic into both the Web bundle and the Native wrapper.
3. **Hardware Sovereignty:** Transition from general-purpose ESP32 to custom RISC-V PCB designs specifically for CivisOS nodes.
