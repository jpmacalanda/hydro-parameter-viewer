
#!/bin/bash

# Create SSL directory
mkdir -p ./ssl

# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./ssl/nginx.key -out ./ssl/nginx.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "SSL certificates generated in ./ssl directory"
echo "Remember to add them to your browser's trusted certificates for local development"
