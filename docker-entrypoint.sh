
#!/bin/sh
set -e

# Check if SSL certificates exist, if not, create self-signed ones
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
    echo "SSL certificates not found, generating self-signed certificates..."
    mkdir -p /etc/nginx/ssl
    chmod 755 /etc/nginx/ssl
    
    # Generate certificate for your Raspberry Pi IP
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=192.168.1.34" \
      -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"
    
    echo "Self-signed certificates generated successfully for IP 192.168.1.34."
else
    echo "Using existing SSL certificates."
fi

# Ensure SSL directory and files have proper permissions
chmod -R 755 /etc/nginx/ssl
chmod 644 /etc/nginx/ssl/nginx.crt
chmod 640 /etc/nginx/ssl/nginx.key

# Check if the nginx config exists
if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
    echo "NGINX configuration not found, please check your Docker setup"
    exit 1
fi

echo "Starting NGINX with the following configuration:"
cat /etc/nginx/conf.d/default.conf

# Execute the main container command
exec "$@"
