# Dockerfile for the Vite-based web client

# ---- Build stage: install deps and generate static assets ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with a clean, reproducible install
COPY package*.json ./
RUN npm ci

# Copy the rest of the client source and build it
COPY . .
RUN npm run build

# ---- Runtime stage: serve prebuilt assets with nginx ----
FROM nginx:alpine AS runner

# Copy the compiled static assets into the default nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Uncomment and add a custom nginx.conf if you need advanced routing
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
