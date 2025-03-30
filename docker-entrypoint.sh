
#!/bin/sh

# Check if SSL certificates exist, if not, create self-signed ones
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
    echo "SSL certificates not found, generating self-signed certificates..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=US/ST=State/L=City/O=Hydroponics/CN=192.168.1.34" \
      -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"
    echo "Self-signed certificates generated successfully for IP 192.168.1.34."
else
    echo "Using existing SSL certificates."
fi

# Make sure SSL directory has proper permissions
chmod -R 755 /etc/nginx/ssl

# Execute the main container command
exec "$@"
