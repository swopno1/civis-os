/**
 * CivisOS Compression Utility
 * Uses the native CompressionStream API (gzip) for efficient data storage.
 * Helps meet Phase 3 Vault goals: 100+ documents in 10MB quota.
 */

export class Compression {
  /**
   * Compresses a Uint8Array using gzip.
   */
  static async compress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    }).pipeThrough(new CompressionStream('gzip'));

    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /**
   * Decompresses a gzip-compressed Uint8Array.
   */
  static async decompress(data: Uint8Array): Promise<Uint8Array> {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    }).pipeThrough(new DecompressionStream('gzip'));

    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
}
