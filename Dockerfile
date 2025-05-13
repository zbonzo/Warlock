# Stage 1: Build the React frontend
FROM node:18-alpine AS builder_frontend
WORKDIR /app_frontend

# Copy client's package.json and lock file
COPY client/package.json client/package-lock.json* ./
RUN npm install

# Copy the rest of the client application's source code
COPY client/ ./

# Build the client application for production
RUN npm run build

# Stage 2: Prepare the Node.js backend
FROM node:18-alpine AS builder_backend
WORKDIR /app_backend

# Copy backend's package.json and lock file (if they exist)
COPY server/package.json server/package-lock.json* ./
# Install backend dependencies (only production if package.json exists)
RUN if [ -f package.json ]; then npm install --only=production; fi

# Copy the rest of the backend application's source code
COPY server/ ./

# Stage 3: Final image to run both frontend (via Nginx) and backend
FROM node:18-alpine
LABEL maintainer="Zachery Bonzo (Zachery@bonzo.dev)"
LABEL game="Warlock"

ENV NODE_ENV=production

# Install Nginx and Supervisor
RUN apk add --no-cache nginx supervisor

# Create a non-root user for the Node.js application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set up directories
WORKDIR /opt/app
RUN mkdir -p /opt/app/frontend_build /opt/app/backend \
             /var/log/supervisor /var/log/nginx \
             /run/nginx # Nginx needs this for its PID file

COPY --from=builder_frontend /app_frontend/build /opt/app/frontend_build
COPY --from=builder_backend /app_backend /opt/app/backend

RUN chown -R appuser:appgroup /opt/app

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisor.conf /etc/supervisord.conf

EXPOSE 80
EXPOSE 3001

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]

