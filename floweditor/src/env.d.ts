// Vite client types disabled to prevent WebSocket connections
// /// <reference types="vite/client" />

// Define minimal environment types without Vite client
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
