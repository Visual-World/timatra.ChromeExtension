import { createApp } from "vue"
import Popup from "./Popup.vue"

// Vuetify
import "vuetify/styles"
import { createVuetify } from "vuetify"
import { md3 } from "vuetify/blueprints"
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

const vuetify = createVuetify({
  blueprint: md3,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
        mdi
    }
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: "#1976D2",
          secondary: "#135ca4",
          surface: "#f1f7fd",
        },
      },
    },
  },
})

createApp(Popup).use(vuetify).mount("#app")
