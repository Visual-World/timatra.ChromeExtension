import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify"

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@p": fileURLToPath(new URL("./src/popup", import.meta.url)),
    },
  },
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      input: ["/src/background.ts", "/src/content-scripts/main-cs.ts", "/src/popup/index.html"],
      output: {
        entryFileNames: `assets/[name].js`,
      },
    },
  },
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify({
      autoImport: true,
      styles: {
        configFile: "src/styles/settings.scss",
      },
    }),
  ],
})
