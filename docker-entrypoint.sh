
#!/bin/sh
set -e

echo "Starting NGINX container..."

# Create SSL directory
mkdir -p /etc/nginx/ssl
chmod 755 /etc/nginx/ssl

# Check for certificates
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
    echo "Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=localhost" \
      -addext "subjectAltName = IP:127.0.0.1,DNS:localhost"
    echo "Certificates generated."
else
    echo "Using existing certificates."
fi

# Set permissions
chmod 644 /etc/nginx/ssl/nginx.crt
chmod 640 /etc/nginx/ssl/nginx.key

# Start nginx
nginx -g "daemon off;"
