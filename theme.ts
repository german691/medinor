"use client";
import { createTheme } from "@mui/material/styles";
import InterThin from "./src/fonts/inter-v19-latin-100.woff2";
import InterThinItalic from "./src/fonts/inter-v19-latin-100italic.woff2";
import InterExtraLight from "./src/fonts/inter-v19-latin-200.woff2";
import InterExtraLightItalic from "./src/fonts/inter-v19-latin-200italic.woff2";
import InterLight from "./src/fonts/inter-v19-latin-300.woff2";
import InterLightItalic from "./src/fonts/inter-v19-latin-300italic.woff2";
import InterRegular from "./src/fonts/inter-v19-latin-regular.woff2";
import InterItalic from "./src/fonts/inter-v19-latin-italic.woff2";
import InterMedium from "./src/fonts/inter-v19-latin-500.woff2";
import InterMediumItalic from "./src/fonts/inter-v19-latin-500italic.woff2";
import InterSemiBold from "./src/fonts/inter-v19-latin-600.woff2";
import InterSemiBoldItalic from "./src/fonts/inter-v19-latin-600italic.woff2";
import InterBold from "./src/fonts/inter-v19-latin-700.woff2";
import InterBoldItalic from "./src/fonts/inter-v19-latin-700italic.woff2";
import InterExtraBold from "./src/fonts/inter-v19-latin-800.woff2";
import InterExtraBoldItalic from "./src/fonts/inter-v19-latin-800italic.woff2";
import InterBlack from "./src/fonts/inter-v19-latin-900.woff2";
import InterBlackItalic from "./src/fonts/inter-v19-latin-900italic.woff2";

const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true, dark: true },

  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h1: { fontWeight: 300 },
    h2: { fontWeight: 300 },
    h3: { fontWeight: 400 },
    h4: { fontWeight: 500 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 400 },
    subtitle2: { fontWeight: 500 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 600, textTransform: "none" },
    caption: { fontWeight: 400 },
    overline: { fontWeight: 600 },
    fontWeightBold: 700,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        // --- 3. Definición de todos los pesos y estilos de "Inter" ---
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 100; font-display: swap; src: url(${InterThin}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 100; font-display: swap; src: url(${InterThinItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 200; font-display: swap; src: url(${InterExtraLight}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 200; font-display: swap; src: url(${InterExtraLightItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 300; font-display: swap; src: url(${InterLight}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 300; font-display: swap; src: url(${InterLightItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap; src: url(${InterRegular}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 400; font-display: swap; src: url(${InterItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 500; font-display: swap; src: url(${InterMedium}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 500; font-display: swap; src: url(${InterMediumItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 600; font-display: swap; src: url(${InterSemiBold}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 600; font-display: swap; src: url(${InterSemiBoldItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; font-display: swap; src: url(${InterBold}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 700; font-display: swap; src: url(${InterBoldItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 800; font-display: swap; src: url(${InterExtraBold}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 800; font-display: swap; src: url(${InterExtraBoldItalic}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: normal; font-weight: 900; font-display: swap; src: url(${InterBlack}) format('woff2'); }
        @font-face { font-family: 'Inter'; font-style: italic; font-weight: 900; font-display: swap; src: url(${InterBlackItalic}) format('woff2'); }

        // --- 4. Aplicación global forzada ---
        body, body * {
          font-family: "Inter", "Roboto", "Arial", sans-serif !important;
        }
      `,
    },
  },
});

export default theme;
