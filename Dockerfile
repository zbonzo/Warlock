# Stage 1: Build everything in workspace context
FROM node:24-alpine AS builder
WORKDIR /app

# Copy workspace configuration first (for better layer caching)
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all dependencies (this layer will be cached if package files don't change)
RUN npm ci

# Copy all source code
COPY client/ ./client/
COPY server/ ./server/

# Build the React frontend
ENV NODE_ENV=production
ENV REACT_APP_API_URL=/api
RUN npm run build --workspace=client

# Stage 2: Production runtime
FROM node:24-alpine AS production
LABEL maintainer="Zachery Bonzo (Zachery@bonzo.dev)"
LABEL game="Warlock"

ENV NODE_ENV=production

# Install system dependencies
RUN apk add --no-cache nginx supervisor

# Create non-root user early
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create directories with proper ownership from the start
RUN mkdir -p /opt/app/frontend_build /opt/app/workspace \
             /var/log/supervisor /var/log/nginx \
             /run/nginx && \
    chown -R appuser:appgroup /opt/app && \
    chown -R appuser:appgroup /var/log/supervisor

# Copy files with ownership set during copy (much faster than chown after)
COPY --from=builder --chown=appuser:appgroup /app/client/build /opt/app/frontend_build
COPY --from=builder --chown=appuser:appgroup /app /opt/app/workspace

# Copy configuration files
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisor.conf /etc/supervisord.conf

EXPOSE 80
EXPOSE 3001

# Use exec form for better signal handling
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]