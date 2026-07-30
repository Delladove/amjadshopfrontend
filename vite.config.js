import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // listen on the local network too, so a tablet/phone on the same
                // Wi-Fi can open it via this machine's LAN IP (e.g. http://192.168.1.50:5173)
  },
});
