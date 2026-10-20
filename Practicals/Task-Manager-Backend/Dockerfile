FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Environment defaults
ENV PORT=5000 \
    NODE_ENV=production

# Health check
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 5000, path: '/me', method: 'GET' }, (res) => process.exit(res.statusCode ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "server.js"]
