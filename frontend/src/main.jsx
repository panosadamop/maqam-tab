import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import App from "./App.jsx";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary:    { main: "#c9a96e", light: "#e8c87a", dark: "#8b6914" },
    secondary:  { main: "#8b3a2a", light: "#a04830" },
    background: { default: "#0d0a05", paper: "#13100a" },
    text:       { primary: "#e8dcc8", secondary: "#9a8870" },
    success:    { main: "#4a8a5a" },
    warning:    { main: "#d4882a" },
    error:      { main: "#c0392b" },
    divider:    "rgba(201,169,110,0.15)",
  },
  typography: {
    fontFamily: "'Ubuntu', 'Helvetica Neue', Arial, sans-serif",
    fontSize: 12,
    fontWeightLight:   300,
    fontWeightRegular: 400,
    fontWeightMedium:  500,
    fontWeightBold:    700,
    h1: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 300, letterSpacing: "-0.5px" },
    h2: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 300 },
    h3: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 300 },
    h4: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 300 },
    h5: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 300, letterSpacing: "0.02em" },
    h6: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 400 },
    subtitle1: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 400 },
    subtitle2: { fontFamily: "'Ubuntu', sans-serif", fontWeight: 500 },
    body1: { fontFamily: "'Ubuntu', sans-serif" },
    body2: { fontFamily: "'Ubuntu', sans-serif" },
    caption: { fontFamily: "'Ubuntu', sans-serif" },
    button: { fontFamily: "'Ubuntu', sans-serif", textTransform: "none" },
    overline: { fontFamily: "'Ubuntu', sans-serif" },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiButton:       { styleOverrides: { root: { textTransform: "none", fontFamily: "'Ubuntu', sans-serif" } } },
    MuiTab:          { styleOverrides: { root: { textTransform: "none", fontFamily: "'Ubuntu', sans-serif", minHeight: 46 } } },
    MuiSelect:       { styleOverrides: { select: { fontFamily: "'Ubuntu', sans-serif" } } },
    MuiInputBase:    { styleOverrides: { root: { fontFamily: "'Ubuntu', sans-serif" } } },
    MuiTooltip:      { styleOverrides: { tooltip: { fontFamily: "'Ubuntu', sans-serif", fontSize: "0.68rem" } } },
    MuiPaper:        { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip:         { styleOverrides: { root: { fontFamily: "'Ubuntu', sans-serif" } } },
    MuiListSubheader:{ styleOverrides: { root: { fontFamily: "'Ubuntu', sans-serif" } } },
    MuiMenuItem:     { styleOverrides: { root: { fontFamily: "'Ubuntu', sans-serif" } } },
    MuiTypography:   { defaultProps: { fontFamily: "'Ubuntu', sans-serif" } },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=Ubuntu+Mono:ital,wght@0,400;0,700;1,400&family=Ubuntu+Condensed:wght@400&display=swap');
        *, *::before, *::after { font-family: 'Ubuntu', 'Helvetica Neue', Arial, sans-serif !important; }
        code, .mono, [class*="mono"] { font-family: 'Ubuntu Mono', monospace !important; }
        body { overflow: hidden; background: #0d0a05; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0d0a05; }
        ::-webkit-scrollbar-thumb { background: #2a2218; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
        svg text { font-family: 'Ubuntu', 'Helvetica Neue', Arial, sans-serif !important; }
        svg text.mono { font-family: 'Ubuntu Mono', monospace !important; }
      `}</style>
      <App />
    </ThemeProvider>
  </StrictMode>
);
