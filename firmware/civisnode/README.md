# CivisNode Firmware

This directory contains the firmware for the **CivisNode**, a dedicated hardware component of the CivisOS ecosystem.

## Core Functions
- **Headless Mesh Router:** Routes Reticulum packets via LoRa or other radio modules.
- **PWA Host:** Serves the CivisOS frontend to any device that connects to its local WiFi Access Point.
- **Hardware Bridge:** Connects to computers/smartphones via USB/Serial to provide mesh access.

## Flashing Instructions (Prototype)
1. Install the [Arduino IDE](https://www.arduino.cc/en/software) or [PlatformIO](https://platformio.org/).
2. Add ESP32 board support.
3. Open `civisnode.ino`.
4. Connect your ESP32-S3 or ESP32-C3 via USB.
5. Select the correct board and port, then click **Upload**.

## Hardware Requirements
- **Microcontroller:** ESP32-S3 (recommended for native USB and performance).
- **LoRa Radio (Optional):** Semtech SX1262 or SX1276.
- **Storage:** Minimum 4MB Flash (8MB+ recommended for PWA hosting).

## Roadmap
- [ ] Integration with Reticulum Network Stack (C++ port).
- [ ] SPIFFS/LittleFS storage for the full CivisOS PWA bundle.
- [ ] Low-power sleep modes for solar-powered deployment.
