
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
RUN apk add --no-cache curl openssl dos2unix

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl && \
    chmod 755 /etc/nginx/ssl

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Fix line endings and make executable
RUN dos2unix /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh && \
    sed -i '1s/^.*$/#!/bin/sh/' /docker-entrypoint.sh

# Verify script is readable
RUN cat /docker-entrypoint.sh

EXPOSE 80 443

# Use sh directly to execute the script
ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
