# Phase 5 Implementation Plan: Ecosystem & Localization

This document outlines the multi-stage implementation for CivisOS Phase 5, focusing on global accessibility and community-driven extensibility.

## Stage 1: Translation Engine (Core Localization) - COMPLETED
- **Goal**: Enable RTL and marginalized language support.
- **Implementation**:
    - Centralized `TranslationService` with `useTranslation` hook.
    - Support for English (en) and Arabic (ar) as a proof-of-concept for RTL.
    - Directional metadata (`dir="rtl"`) automatically managed at the document level.
    - Persistent language settings in `CivisStorage`.
- **Survival Focus**: Manual, lightweight dictionaries are used instead of heavy AI models to preserve battery and function fully off-grid.

## Stage 2: Module SDK & Signing - COMPLETED
- **Goal**: Allow 3rd-party developers to build and verify modules.
- **Implementation**:
    - Standardized `ICivisModule` interface with versioning and author metadata.
    - `ModuleSDK` utilizing `tweetnacl` for Ed25519 signatures.
    - Cryptographic verification during module registration.
- **Security Focus**: Ensures that modules shared over the mesh haven't been tampered with.

## Stage 3: Decentralized Distribution (Mesh Market) - COMPLETED
- **Goal**: Eliminate central repositories; share modules over the mesh.
- **Implementation**:
    - `DistributionService` for peer-to-peer signaling (ANNOUNCE/REQUEST/OFFER).
    - `MeshMarketModule` UI for discovering modules from nearby nodes.
- **Resilience Focus**: Uses the Gossip protocol principles to propagate module availability without internet.

## Stage 4: Advanced Localization (Community & AI) - FUTURE
- **Goal**: Scaling localization to all marginalized languages.
- **Planned Implementation**:
    - **Community Bridge**: UI for users to submit translation corrections directly from their device, which then gossip to other nodes.
    - **Local AI Translation**: Optional integration of ultra-lightweight WASM-based LLMs (e.g., TinyLlama or specialized translation models) for "best-effort" translation of unknown languages when a manual dictionary is unavailable.
    - **OCR Translation**: Using the device camera to translate physical survival documents via local Tesseract.js or similar.

## Stage 5: Global Resonance - FUTURE
- **Goal**: Mass adoption and verified safety.
- **Planned Implementation**:
    - Automated audits of signed modules.
    - "Web of Trust" for module signatures.
    - Global localization leaderboard to incentivize contributions.
