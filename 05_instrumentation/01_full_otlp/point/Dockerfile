FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY tracing.js ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --only=production

# Copy built files and tracing setup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tracing.js ./

# Expose port
EXPOSE 8001

# Start with OpenTelemetry auto-instrumentation
CMD ["npm", "start"]
