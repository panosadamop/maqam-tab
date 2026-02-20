import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App.jsx";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#c9a96e", light: "#e8c87a", dark: "#8b6914" },
    secondary: { main: "#8b3a2a", light: "#a04830" },
    background: { default: "#0d0a05", paper: "#15110a" },
    text: { primary: "#e8dcc8", secondary: "#9a8870" },
    success: { main: "#4a8a5a" },
    warning: { main: "#d4882a" },
    error: { main: "#c0392b" },
    divider: "rgba(201,169,110,0.15)",
  },
  typography: {
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontSize: 12,
    h1: { fontFamily: "'Playfair Display', serif" },
    h2: { fontFamily: "'Playfair Display', serif" },
    h3: { fontFamily: "'Playfair Display', serif" },
    h4: { fontFamily: "'Playfair Display', serif" },
    h5: { fontFamily: "'Playfair Display', serif" },
    h6: { fontFamily: "'Playfair Display', serif" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.75rem",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.75rem",
          minHeight: 48,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@400;600&family=Playfair+Display:wght@600;700&display=swap');
        body { overflow: hidden; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d0a05; }
        ::-webkit-scrollbar-thumb { background: #261f14; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
      `}</style>
      <App />
    </ThemeProvider>
  </StrictMode>
);
