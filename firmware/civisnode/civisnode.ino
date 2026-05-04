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

void loop() {
  server.handleClient();

  // 3. Serial-to-Mesh Bridge Logic (Placeholder)
  if (Serial.available()) {
    uint8_t incoming = Serial.read();
    // Logic to route to LoRa/Mesh goes here
    // For now, just echo for testing
    Serial.write(incoming);
  }
}
