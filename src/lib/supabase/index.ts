export { createSupabaseBrowserClient } from "./client";
// Server / admin clients are imported directly from their modules to keep
// server-only imports out of any client bundle that hits this barrel.
