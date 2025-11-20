# Multi-stage Dockerfile for the backend API (Node.js)

# ---- Build stage: install dependencies and compile sources ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install production dependencies using a clean install
COPY package*.json ./
RUN npm ci

# Copy the full backend source and build it
COPY . .
RUN npm run build

# ---- Runtime stage: minimal image to run the compiled app ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy only what is needed to run the app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Expose the API port and start the server
EXPOSE 5000
CMD ["npm", "run", "start:prod"]
