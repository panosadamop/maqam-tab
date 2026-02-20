#!/usr/bin/env bash
# ============================================================
# MaqamTAB - Project Setup Script
# Εκτελέστε: bash setup.sh
# ============================================================
set -e

GREEN='\033[0;32m'
GOLD='\033[0;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GOLD}"
echo "  ███╗   ███╗ █████╗  ██████╗  █████╗ ███╗   ███╗"
echo "  ████╗ ████║██╔══██╗██╔═══██╗██╔══██╗████╗ ████║"
echo "  ██╔████╔██║███████║██║   ██║███████║██╔████╔██║"
echo "  ██║╚██╔╝██║██╔══██║██║▄▄ ██║██╔══██║██║╚██╔╝██║"
echo "  ██║ ╚═╝ ██║██║  ██║╚██████╔╝██║  ██║██║ ╚═╝ ██║"
echo "  ╚═╝     ╚═╝╚═╝  ╚═╝ ╚══▀▀═╝ ╚═╝  ╚═╝╚═╝     ╚═╝"
echo -e "${CYAN}     Ούτι & Σάζι Microtonal Tablature Editor${NC}"
echo ""

echo "🎵 MaqamTAB v2 Setup"
echo "===================="

PROJECT_DIR="maqam-tab"

echo -e "${GREEN}📁 Δημιουργία project δομής...${NC}"
mkdir -p "$PROJECT_DIR"/{frontend/src/{components,hooks,utils,workers},backend,docker}
cd "$PROJECT_DIR"

# ---- Frontend files ----
echo -e "${GOLD}⚛️  Αντιγραφή frontend αρχείων...${NC}"

# package.json
cat > frontend/package.json << 'PKGJSON'
{
  "name": "maqam-tab-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
PKGJSON

cat > frontend/vite.config.js << 'VITECFG'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
})
VITECFG

cat > frontend/index.html << 'HTML'
<!doctype html>
<html lang="el">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MaqamTAB — Ούτι & Σάζι Ταμπλατούρα</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
HTML

echo -e "${GREEN}✅ Frontend structure δημιουργήθηκε${NC}"
echo ""
echo -e "${CYAN}📋 Αντιγράψτε τα JSX αρχεία στο frontend/src/ από τον κατάλογο που σας στάλθηκε${NC}"
echo ""

# ---- Backend ----
echo -e "${GOLD}🐍 Ρύθμιση Python backend...${NC}"

cat > backend/requirements.txt << 'REQS'
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
pydantic==2.8.2
REQS

echo -e "${GREEN}✅ Backend requirements δημιουργήθηκαν${NC}"

# ---- Docker files ----
cat > docker/Dockerfile.frontend << 'DFRONT'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n  location /api/ { proxy_pass http://backend:8000/api/; }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
DFRONT

cat > docker/Dockerfile.backend << 'DBACK'
FROM python:3.12-slim
RUN apt-get update && apt-get install -y lilypond && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
DBACK

cat > docker-compose.yml << 'DC'
version: "3.9"
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    ports: ["3000:80"]
    depends_on: [backend]
    networks: [maqamtab]
  backend:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend
    ports: ["8000:8000"]
    networks: [maqamtab]
    environment: [PYTHONUNBUFFERED=1]
networks:
  maqamtab:
    driver: bridge
DC

# ---- README ----
cat > README.md << 'RDME'
# MaqamTAB 🎵

Microtonal tablature editor for Oud (عود) and Saz (Bağlama).

## Features
- 🎙 Audio recording + pitch detection (YIN algorithm)
- 🧠 Seyir-aware maqam detection (histogram + melodic contour)
- 📏 Rhythm quantization (1/8, 1/16 with onset detection)
- ✏️ Interactive TAB editor (notes, strings, frets, ornaments)
- 🎼 Microtonal MusicXML export (fractional alter)
- 📄 PDF staff+TAB via LilyPond backend
- 🎛 Multiple tunings: Arabic/Turkish/Persian oud, Bağlama variants

## Quick Start (Local)

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend (optional, needed for PDF export)
```bash
cd backend
pip install -r requirements.txt
# Install LilyPond: https://lilypond.org
uvicorn main:app --reload --port 8000
```

## Docker

```bash
docker compose up --build
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/docs
```

## Supported Maqamat
Rast, Bayati, Hijaz, Nahawand, Saba, Kurd, Sikah, Ajam, Hicazkar, Husseini

## Export Formats
- MusicXML (microtonal, MuseScore/Sibelius compatible)
- ASCII TAB (.txt)
- JSON (full microtonal data)
- PDF staff+TAB (requires LilyPond + backend)
RDME

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GOLD}  ✅ Setup ολοκληρώθηκε!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📋 Επόμενα βήματα:${NC}"
echo ""
echo -e "  1. Αντιγράψτε τα .jsx και .js αρχεία στα σωστά μονοπάτια"
echo -e "     (βλ. README.md για λεπτομέρειες)"
echo ""
echo -e "  2. ${GOLD}Εκκίνηση frontend:${NC}"
echo -e "     cd $PROJECT_DIR/frontend"
echo -e "     npm install && npm run dev"
echo ""
echo -e "  3. ${GOLD}Εκκίνηση backend (για PDF):${NC}"
echo -e "     cd $PROJECT_DIR/backend"
echo -e "     pip install -r requirements.txt"
echo -e "     uvicorn main:app --reload"
echo ""
echo -e "  4. ${GOLD}Με Docker:${NC}"
echo -e "     cd $PROJECT_DIR"
echo -e "     docker compose up --build"
echo ""
echo -e "  🌐 Frontend: http://localhost:3000"
echo -e "  🔌 Backend API docs: http://localhost:8000/docs"
echo ""
