
#!/bin/sh
set -e

echo "Starting hydroponics webapp container setup..."

# Create SSL directory if it doesn't exist
mkdir -p /etc/nginx/ssl
chmod 755 /etc/nginx/ssl

# Check if SSL certificates exist, if not, create self-signed ones
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
    echo "SSL certificates not found, generating self-signed certificates..."
    
    # Generate certificate for your Raspberry Pi IP
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=localhost" \
      -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"
    
    echo "Self-signed certificates generated successfully."
else
    echo "Using existing SSL certificates."
fi

# Ensure SSL directory and files have proper permissions
chmod -R 755 /etc/nginx/ssl
chmod 644 /etc/nginx/ssl/nginx.crt
chmod 640 /etc/nginx/ssl/nginx.key

# Test nginx config before starting
echo "Testing NGINX configuration..."
nginx -t

# Start nginx
echo "Starting NGINX..."
exec nginx -g "daemon off;"
