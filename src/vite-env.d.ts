/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Injected by `define` — see scripts/buildInfo.ts. Never write these by hand. */
declare const __APP_VERSION__: string
/** ISO instant of the build, injected the same way. */
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  /** Google OAuth client ID for the Drive backup; empty = not configured.
   *  See .env.example for why it is public and why it must not be rotated. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}
