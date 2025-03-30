
#!/bin/sh
# Simple certificate generation script for Raspberry Pi

# Create SSL directory
mkdir -p ./ssl

# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/nginx.key -out ./ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
  -addext "subjectAltName = IP:192.168.1.34,IP:127.0.0.1,DNS:localhost"

# Set proper permissions
chmod 755 ./ssl
chmod 644 ./ssl/nginx.crt
chmod 640 ./ssl/nginx.key

echo "SSL certificates generated in ./ssl directory"
echo "Remember to add them to your browser's trusted certificates for local development"
