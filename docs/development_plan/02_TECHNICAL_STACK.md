# The Technical Stack

CivisOS employs a strictly neutral, open-source stack to satisfy our core mandate of skipping superpower influence and ensuring verifiable trust globally. We deliberately avoid proprietary US/Israeli stacks (like Firebase or AWS) and prioritize offline-first, decentralized technologies.

## 1. Core Protocol
* **Technology:** Reticulum Network Stack (RNS)
* **Purpose:** Provides end-to-end encryption and P2P routing over any medium (internet, local mesh, LoRa, etc.), ensuring un-routable and decentralized communication.

## 2. Frontend (Web-OS)
* **Technology:** Preact + Rust (via WebAssembly/WASM)
* **Purpose:**
  * **Preact:** Delivers a high-performance, low-footprint Progressive Web App (PWA).
  * **Rust/WASM:** Handles heavy cryptographic logic efficiently in the browser.

## 3. Local Database
* **Technology:** PouchDB/IndexedDB with GunDB
* **Purpose:**
  * **PouchDB:** Acts as an offline-first No-SQL database living entirely in the user's browser.
  * **GunDB:** Facilitates decentralized, peer-to-peer graph synchronization between users without a central server.

## 4. AI Engine
* **Technology:** WebLLM or ONNX Runtime
* **Purpose:** Allows lightweight AI models (e.g., TinyLlama) to run directly on the local device's GPU/CPU, enabling intelligent features completely offline.

## 5. Mobile Shell
* **Technology:** Capacitor.js or Native Kotlin
* **Purpose:** Wraps the web application for Android deployment, crucially ensuring the app has native access to hardware radios, Web-Serial, and Bluetooth for external node communication.

## 6. Hosting (Trust-Neutral)
* **Provider:** Self-hosted, Hetzner (Germany), or Infomaniak (Switzerland)
* **Purpose:** Adhering to the neutrality mandate by strictly avoiding AWS, Google Cloud, or Azure.

## 7. Hardware Firmware
* **Technology:** MicroPython or C++ (Arduino/ESP-IDF)
* **Purpose:** Powers the physical "Civis-Node" hardware built on ESP32 or RISC-V architectures.
