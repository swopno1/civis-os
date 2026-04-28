/**
 * CivisOS Module Interface Specification
 * Defines how an external plugin registers itself with the OS, requests permissions, and mounts its UI.
 */

// Permissions a module can request from the OS
export type CivisPermission = 
  | 'mesh:read'    // Listen to local mesh events
  | 'mesh:write'   // Broadcast to local mesh
  | 'storage:read' // Read from local DB
  | 'storage:write'// Write to local DB
  | 'hardware:usb' // Access serial ports
  | 'hardware:bt'; // Access bluetooth

export interface ICivisModuleContext {
  // Methods provided to the module by the OS upon initialization
  requestPermission: (permission: CivisPermission) => Promise<boolean>;
  getStorageInstance: (namespace: string) => Promise<any>; // E.g., PouchDB instance
  getMeshClient: () => any; // E.g., Reticulum connection
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
   * Called to unmount the UI and pause background tasks
   */
  unmount: () => void;
  
  /**
   * Called before removing the module completely from the OS
   */
  destroy: () => Promise<void>;
}
