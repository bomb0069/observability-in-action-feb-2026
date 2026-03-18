FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for @pyroscope/nodejs
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install native build tools for @pyroscope/nodejs
RUN apk add --no-cache python3 make g++

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built files
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8001

# Start the service
CMD ["node", "dist/index.js"]
