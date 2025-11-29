# KETMAR Market - Production Dockerfile
# Monolithic app: Express backend + Vite frontend

FROM node:20-alpine

WORKDIR /app

# Install dependencies for native modules (sharp, etc.)
RUN apk add --no-cache python3 make g++ vips-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build main frontend (Vite)
RUN npm run build

# Build MiniApp
RUN cd miniapp && npm ci && npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start server
CMD ["node", "index.js"]
