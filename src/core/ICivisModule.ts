/**
 * CivisOS Module Interface Specification
 * Defines how an external plugin registers itself with the OS, requests permissions, and mounts its UI.
 */

// Permissions a module can request from the OS
export type CivisPermission = 
  | 'mesh:read'    // Listen to local mesh events
  | 'mesh:write'   // Broadcast to local mesh
  | 'storage:read'   // Read from local DB
  | 'storage:write'  // Write to local DB
  | 'hardware:serial'// Access serial ports
  | 'hardware:usb'    // Access generic USB devices
  | 'hardware:bt';   // Access bluetooth

export interface IMeshClient {
  send: (data: Uint8Array | string, destination?: string) => Promise<void>;
  listen: (callback: (data: Uint8Array) => void) => () => void;
}

export interface ICivisStorageInstance {
  dbName: string;
  get: <T = unknown>(key: string) => Promise<T | null>;
  put: <T = unknown>(key: string, val: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface ICivisModuleContext {
  // Methods provided to the module by the OS upon initialization
  requestPermission: (permission: CivisPermission) => Promise<boolean>;
  getStorageInstance: (namespace: string) => Promise<ICivisStorageInstance>;
  getMeshClient: () => IMeshClient;

  // Hardware Bridging
  requestSerialPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
  getSerialPorts: () => Promise<SerialPort[]>;
}

export interface ICivisModule {
  /**
   * Unique identifier for the module (e.g., 'org.civisos.meshchat')
   */
  id: string;

  /**
   * Human readable name localized for the OS language
   */
  name: string;

  /**
   * Version of the module (SemVer)
   */
  version: string;

  /**
   * Author or organization
   */
  author: string;

  /**
   * Cryptographic signature of the module bundle (optional for local/dev)
   */
  signature?: string;

  /**
   * Module-specific translations
   */
  translations?: Record<string, Record<string, string>>;

  /**
   * Base64 or SVG icon representing the module in the UI
   */
  icon: string;

  /**
   * List of required permissions for the module to function
   */
  permissions: CivisPermission[];

  /**
   * Called by the OS when the module is installed/loaded into memory
   */
  init: (context: ICivisModuleContext) => Promise<void>;

  /**
   * Called to mount the module's UI into a DOM node provided by the Window Manager
   */
  mount: (container: HTMLElement) => void;

  /**
   * Called to unmount the UI (e.g., when window is closed but module stays in memory)
   */
  unmount: () => void;

  /**
   * Called to pause background tasks (e.g., when OS enters low power mode or module is deactivated)
   */
  suspend: () => Promise<void>;

  /**
   * Called to resume background tasks from suspended state
   */
  resume: () => Promise<void>;

  /**
   * Called before the OS saves its state or the module window is closed.
   * Useful for persisting unsaved data.
   */
  onSaveState?: () => Promise<void>;
  
  /**
   * Called before removing the module completely from the OS
   */
  destroy: () => Promise<void>;
}
