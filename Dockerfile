
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

# Create SSL directory with proper permissions
RUN mkdir -p /etc/nginx/ssl && \
    chmod 755 /etc/nginx/ssl

# Add startup script to check for certificates
COPY docker-entrypoint.sh /docker-entrypoint.sh
# Ensure the script is executable and has Unix line endings
RUN chmod +x /docker-entrypoint.sh && \
    sed -i 's/\r$//' /docker-entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
