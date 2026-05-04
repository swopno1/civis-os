/**
 * CivisNode Firmware (Prototype)
 *
 * Objectives:
 * 1. Act as a headless Mesh Router (using Reticulum/LoRa).
 * 2. Serve the CivisOS PWA via a local WiFi Access Point.
 * 3. Bridge Serial/USB data to the Mesh Network.
 */

#include <WiFi.h>
#include <WebServer.h>

// Configuration
const char* ssid = "CivisNode-001";
const char* password = "resilience-now"; // Change for deployment

WebServer server(80);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- CivisNode Initializing ---");

  // 1. Setup WiFi Access Point
  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  // 2. Setup Web Server (Placeholder for PWA serving)
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html", "<h1>CivisOS Node</h1><p>Ready to serve Digital Lifeboat PWA.</p>");
  });
  server.begin();

  Serial.println("CivisNode Ready. Awaiting Mesh initialization...");
}

// Packet Buffer for Serial Framing
uint8_t serialBuffer[1024];
int bufferIndex = 0;

void loop() {
  server.handleClient();

  // 3. Serial-to-LoRa Bridge Logic (Traffic Neutral)
  // The firmware doesn't need to know the packet content.
  // It only needs to respect the Serial framing.
  if (Serial.available()) {
    while (Serial.available() && bufferIndex < 1024) {
      serialBuffer[bufferIndex++] = Serial.read();

      // Check if we have at least the length prefix (2 bytes)
      if (bufferIndex >= 2) {
        uint16_t packetLen = serialBuffer[0] | (serialBuffer[1] << 8);

        // Check if the full packet has arrived
        if (bufferIndex >= 2 + packetLen) {
          // Full packet received from Serial!
          // ROUTE TO LORA (Placeholder)
          // For now, echo back to Serial to simulate mesh loopback/broadcast
          Serial.write(serialBuffer, 2 + packetLen);

          // Reset buffer
          bufferIndex = 0;
        }
      }
    }
  }
}
