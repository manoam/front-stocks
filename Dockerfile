# Frontend Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build argument for API URL
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the app
RUN npm run build

# Production stage - use serve for Railway
FROM node:20-alpine AS production

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files
COPY --from=build /app/dist ./dist

# Expose port (Railway uses PORT env variable)
EXPOSE 3000

# Start server - Railway will set PORT
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
