/**
 * Hardware Bridge for CivisOS
 * Provides Web-Serial API integration to connect the browser Web-OS with local
 * ESP32/LoRa radios via USB for mesh networking (e.g., Reticulum packets).
 */

export class HardwareBridge {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private onDataReceived: (data: Uint8Array) => void = () => {};

  /**
   * Set a callback for incoming data
   */
  public setOnDataReceived(callback: (data: Uint8Array) => void) {
    this.onDataReceived = callback;
  }

  /**
   * Request user permission and connect to a serial device
   */
  async connect(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser.');
      }

      // Prompt user to select an ESP32 / serial device
      this.port = await navigator.serial.requestPort();
      
      // Standard baud rate for ESP32 serial comms
      await this.port.open({ baudRate: 115200 });
      
      console.log('[HardwareBridge] Connected to serial port.');
      this.startListening();
      return true;
    } catch (err) {
      console.error('[HardwareBridge] Connection failed:', err);
      return false;
    }
  }

  /**
   * Listen for incoming data packets (e.g., LoRa packets routed from ESP32)
   */
  private async startListening() {
    if (!this.port) return;

    try {
      while (this.port.readable) {
        this.reader = this.port.readable.getReader();
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) {
              // Reader has been canceled
              break;
            }
            if (value) {
              this.handleIncomingData(value);
            }
          }
        } catch (error) {
          console.error('[HardwareBridge] Read error:', error);
        } finally {
          this.reader.releaseLock();
        }
      }
    } catch (e) {
      console.error('[HardwareBridge] Stream closed:', e);
    }
  }

  /**
   * Process binary data received from the hardware
   */
  private handleIncomingData(data: Uint8Array) {
    // In a real implementation, this would parse Reticulum protocol frames
    console.log(`[HardwareBridge] Received ${data.length} bytes from radio.`);
    this.onDataReceived(data);
  }

  /**
   * Send a binary packet to the hardware to be broadcasted over LoRa/Mesh
   */
  async sendPacket(data: Uint8Array): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new Error('Serial port not connected or not writable.');
    }

    this.writer = this.port.writable.getWriter();
    try {
      await this.writer.write(data);
      console.log(`[HardwareBridge] Sent ${data.length} bytes to radio.`);
    } catch (error) {
      console.error('[HardwareBridge] Write error:', error);
    } finally {
      this.writer.releaseLock();
    }
  }

  /**
   * Close the connection gracefully
   */
  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
    }
    if (this.writer) {
      await this.writer.close();
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
      console.log('[HardwareBridge] Disconnected.');
    }
  }
}
