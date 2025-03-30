
#!/bin/sh

# Check if SSL certificates exist, if not, create self-signed ones
if [ ! -f "/etc/nginx/ssl/nginx.crt" ] || [ ! -f "/etc/nginx/ssl/nginx.key" ]; then
    echo "SSL certificates not found, generating self-signed certificates..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt \
      -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo "Self-signed certificates generated successfully."
else
    echo "Using existing SSL certificates."
fi

# Execute the main container command
exec "$@"
