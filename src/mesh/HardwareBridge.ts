/**
 * Hardware Bridge for CivisOS
 * Provides Web-Serial API integration to connect the browser Web-OS with local
 * ESP32/LoRa radios via USB for mesh networking (e.g., Reticulum packets).
 */

export class HardwareBridge {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private onDataReceived: (data: Uint8Array) => Promise<void> = async () => {};

  /**
   * Set a callback for incoming data
   */
  public setOnDataReceived(callback: (data: Uint8Array) => Promise<void>) {
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
        let buffer = new Uint8Array(0);
        try {
          while (true) {
            const { value, done } = await this.reader.read();
            if (done) {
              // Reader has been canceled
              break;
            }
            if (value) {
              // Accumulate data in buffer
              const newBuffer = new Uint8Array(buffer.length + value.length);
              newBuffer.set(buffer);
              newBuffer.set(value, buffer.length);
              buffer = newBuffer;

              // Process all complete frames in the buffer
              // Frame format: [Length LSB] [Length MSB] [Data...]
              while (buffer.length >= 2) {
                const length = buffer[0] | (buffer[1] << 8);
                if (buffer.length >= 2 + length) {
                  const packet = buffer.slice(2, 2 + length);
                  await this.handleIncomingData(packet);
                  buffer = buffer.slice(2 + length);
                } else {
                  // Incomplete frame, wait for more data
                  break;
                }
              }
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
  private async handleIncomingData(data: Uint8Array) {
    console.log(`[HardwareBridge] Received complete framed packet: ${data.length} bytes.`);
    await this.onDataReceived(data);
  }

  /**
   * Send a binary packet to the hardware to be broadcasted over LoRa/Mesh
   */
  async sendPacket(data: Uint8Array): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new Error('Serial port not connected or not writable.');
    }

    // Add 2-byte length prefix for framing
    const framed = new Uint8Array(2 + data.length);
    framed[0] = data.length & 0xff;
    framed[1] = (data.length >> 8) & 0xff;
    framed.set(data, 2);

    this.writer = this.port.writable.getWriter();
    try {
      await this.writer.write(framed);
      console.log(`[HardwareBridge] Sent ${data.length} bytes (framed) to radio.`);
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
