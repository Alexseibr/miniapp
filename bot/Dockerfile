# Dockerfile for the Telegram bot service (Node.js)

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy bot source code
COPY . .

# Start the bot via the package.json start script
CMD ["npm", "run", "start"]
