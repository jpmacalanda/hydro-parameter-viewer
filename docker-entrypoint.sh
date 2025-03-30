
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
    
    if [ $? -ne 0 ]; then
        echo "Failed to generate SSL certificates. Check OpenSSL installation."
        exit 1
    fi
    
    echo "Self-signed certificates generated successfully."
else
    echo "Using existing SSL certificates."
fi

# Ensure SSL directory and files have proper permissions
chmod -R 755 /etc/nginx/ssl
chmod 644 /etc/nginx/ssl/nginx.crt
chmod 640 /etc/nginx/ssl/nginx.key

# Check if the nginx config exists
if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "ERROR: NGINX configuration not found at /etc/nginx/conf.d/default.conf"
    ls -la /etc/nginx/conf.d/
    exit 1
fi

echo "Starting NGINX with the following configuration:"
cat /etc/nginx/conf.d/default.conf

# Test nginx config before starting
echo "Testing NGINX configuration..."
nginx -t

if [ $? -ne 0 ]; then
    echo "NGINX configuration test failed!"
    exit 1
fi

echo "NGINX configuration test passed. Starting NGINX..."

# Execute the main container command
exec "$@"
