import { useState } from "react";
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  IconButton, TextField, Tooltip, Chip, Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EditIcon from "@mui/icons-material/Edit";
import { INSTRUMENTS, midiToName } from "../utils/instruments";

export default function TuningPanel({ instrument, tuning, onTuningChange }) {
  const [expanded, setExpanded] = useState(true);
  const [editingString, setEditingString] = useState(null);

  const inst = INSTRUMENTS[instrument];
  const tunings = inst.tunings;

  const handleTuningSelect = (id) => {
    const t = tunings.find((t) => t.id === id);
    if (t) onTuningChange(t);
  };

  const handleStringMidiChange = (idx, midi) => {
    const updated = {
      ...tuning,
      strings: tuning.strings.map((s, i) =>
        i === idx ? { ...s, midi: parseInt(midi) || s.midi, name: midiToName(parseInt(midi) || s.midi) } : s
      ),
    };
    onTuningChange(updated);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          mb: 1,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography
          variant="caption"
          sx={{
            color: "primary.main",
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontWeight: 600,
          }}
        >
          Κούρδισμα
        </Typography>
        {expanded ? (
          <ExpandLessIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        ) : (
          <ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        )}
      </Box>

      <Collapse in={expanded}>
        <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
          <Select
            value={tuning.id}
            onChange={(e) => handleTuningSelect(e.target.value)}
            sx={{
              fontSize: "0.7rem",
              bgcolor: "background.default",
              "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" },
            }}
          >
            {tunings.map((t) => (
              <MenuItem key={t.id} value={t.id} sx={{ fontSize: "0.7rem" }}>
                {t.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {tuning.arabic && (
          <Typography
            sx={{
              fontFamily: "'Amiri', serif",
              direction: "rtl",
              fontSize: "0.85rem",
              color: "text.secondary",
              textAlign: "right",
              mb: 1,
            }}
          >
            {tuning.arabic}
          </Typography>
        )}

        {/* String list */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {tuning.strings.map((s, i) => (
            <Box
              key={i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                p: 0.5,
                borderRadius: 0.5,
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", minWidth: 18 }}
              >
                {i + 1}
              </Typography>
              {editingString === i && tuning.editable ? (
                <TextField
                  type="number"
                  size="small"
                  defaultValue={s.midi}
                  onBlur={(e) => {
                    handleStringMidiChange(i, e.target.value);
                    setEditingString(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleStringMidiChange(i, e.target.value);
                      setEditingString(null);
                    }
                  }}
                  autoFocus
                  inputProps={{ min: 24, max: 96 }}
                  sx={{
                    flex: 1,
                    "& .MuiInputBase-input": {
                      p: 0.25,
                      fontSize: "0.65rem",
                      fontFamily: "monospace",
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="caption"
                  sx={{ color: "primary.light", flex: 1, fontFamily: "monospace", fontWeight: 600 }}
                >
                  {s.name}
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.6rem" }}
              >
                MIDI {s.midi}
              </Typography>
              {tuning.editable && (
                <IconButton
                  size="small"
                  sx={{ p: 0.25 }}
                  onClick={() => setEditingString(editingString === i ? null : i)}
                >
                  <EditIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
