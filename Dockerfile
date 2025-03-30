
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf.default

# Install essential tools
RUN apk add --no-cache curl openssl busybox

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl && \
    chmod 755 /etc/nginx/ssl

# Copy entrypoint script and fix line endings
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Critical fix: Ensure the script has proper line endings and is executable
# Convert CRLF to LF and ensure proper permissions
RUN cat /docker-entrypoint.sh | tr -d '\r' > /tmp/fixed-entrypoint.sh && \
    mv /tmp/fixed-entrypoint.sh /docker-entrypoint.sh && \
    chmod 755 /docker-entrypoint.sh && \
    cat /docker-entrypoint.sh | head -1 | grep -q '^#!/bin/sh' || echo "Warning: Entrypoint does not start with proper shebang"

# Verify script is readable
RUN cat /docker-entrypoint.sh

EXPOSE 80 443

# Use sh to execute the script instead of direct execution
CMD ["sh", "/docker-entrypoint.sh"]
