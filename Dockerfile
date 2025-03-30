
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

# Install tools for debugging
RUN apk add --no-cache curl openssl

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl && \
    chmod 755 /etc/nginx/ssl

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Ensure script has the correct line endings and is executable
# We directly modify the file to ensure UNIX line endings
RUN sed -i 's/\r$//' /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

EXPOSE 80 443
CMD ["/bin/sh", "/docker-entrypoint.sh"]
