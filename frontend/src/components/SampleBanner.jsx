import { Box, Typography, Chip, IconButton, Collapse } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

/**
 * Banner shown at the top of each panel when the Rast sample is loaded.
 * Dismissed per-session by the user.
 */
export default function SampleBanner({ maqam, onDismiss }) {
  if (!maqam?.isSample) return null;

  return (
    <Collapse in>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1,
          background: "linear-gradient(90deg, rgba(201,169,110,0.12), rgba(139,58,42,0.08))",
          borderBottom: "1px solid rgba(201,169,110,0.25)",
          flexShrink: 0,
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16, color: "primary.main", flexShrink: 0 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, flexWrap: "wrap" }}>
          <Chip
            label="ΔΕΙΓΜΑ"
            size="small"
            sx={{
              bgcolor: "rgba(201,169,110,0.2)",
              color: "primary.light",
              fontWeight: 700,
              fontSize: "0.6rem",
              height: 18,
              letterSpacing: 1,
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Loaded sample maqam
          </Typography>
          <Typography
            sx={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "0.8rem",
              color: "primary.light",
              fontWeight: 600,
            }}
          >
            Rast
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            — D scale, neutral 3rd (350¢), ascending seyir
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[0, 200, 350, 500, 700, 900, 1050, 1200].map((c, i) => (
              <Chip
                key={i}
                label={`${c}¢`}
                size="small"
                variant="outlined"
                sx={{
                  height: 16,
                  fontSize: "0.55rem",
                  fontFamily: "'Ubuntu Mono', monospace",
                  borderColor: c === 350 || c === 1050 ? "primary.main" : "divider",
                  color: c === 350 || c === 1050 ? "primary.main" : "text.secondary",
                }}
              />
            ))}
          </Box>
        </Box>

        <IconButton size="small" onClick={onDismiss} sx={{ flexShrink: 0, p: 0.25, color: "text.secondary" }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Collapse>
  );
}
