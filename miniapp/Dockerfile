# Dockerfile for the Telegram MiniApp (Vite)

# ---- Build stage: install dependencies and build static files ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies with npm ci for reproducible builds
COPY package*.json ./
RUN npm ci

# Copy MiniApp source code and run the build
COPY . .
RUN npm run build

# ---- Runtime stage: lightweight nginx image to serve static assets ----
FROM nginx:alpine AS runner

# Place built assets into the nginx public directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Uncomment to provide custom nginx configuration
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
