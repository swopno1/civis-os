# DevOps and Distribution Plan

CivisOS requires a unique DevOps strategy because it is designed for environments where traditional CI/CD pipelines (GitHub Actions, cloud runners) might be unreachable or censored.

---

## 🏗️ 1. Reproducible Builds
To ensure trust (Fact 4), every build of CivisOS must be reproducible.
- **Goal:** Any developer can clone the repo and produce a bit-for-bit identical PWA bundle or WASM binary.
- **Action:** Utilize Docker-based build environments with pinned versions for all dependencies (Node, Rust, WASM-pack).

## 🚀 2. CI/CD Pipeline
- **Continuous Integration:** Every PR triggers a suite of unit tests (`node:test`) and E2E verification (`Playwright`).
- **Continuous Deployment:** Merges to `main` auto-deploy to the primary PWA hosting (IPFS + Neutral traditional hosting).
- **Security Scans:** Automated scanning for vulnerable npm/cargo dependencies.

## 📦 3. Decentralized Distribution
CivisOS cannot rely solely on `https://civis-os.com`.
- **IPFS Persistence:** The OS bundle is pinned on IPFS, allowing any IPFS node to serve the OS.
- **Mesh Update Protocol:** Implementing a protocol where mesh nodes can "gossip" about new OS versions and share the update files P2P.
- **Local Host:** The "CivisNode" hardware (ESP32) acts as a local web server, serving the PWA to any device that joins its WiFi AP.

## 🛠️ 4. Offline-First Tooling
- **Local Dev Environment:** The entire development environment (including mock mesh networks) must be runnable locally without an internet connection.
- **Peer-Review Workflow:** For environments with limited connectivity, we support git-bundle based patch submissions.

## 📊 5. Monitoring (Privacy-Preserving)
- **NO Telemetry:** CivisOS explicitly forbids tracking or telemetry.
- **Self-Diagnostics:** The OS includes a "Diagnostic Module" that allows users to locally inspect their node's health and mesh performance without sending data to a central server.
