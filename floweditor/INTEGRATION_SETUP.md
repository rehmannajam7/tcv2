# FlowEditor Integration with Chatwoot

This document provides setup and deployment instructions for integrating FlowEditor with Chatwoot.

## Overview

FlowEditor is integrated into Chatwoot as an iframe-embedded application. The integration consists of:
- **FlowEditor Frontend** (port 3001): React-based UI for flow editing
- **FlowEditor API** (port 6000): Backend API for flow management
- **Chatwoot** (port 3000): Main application with embedded FlowEditor

## Configuration Changes Made

### 1. CORS Configuration

#### FlowEditor API Server (`/server/src/index.js`)
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',     // Chatwoot
    'http://localhost:3001',     // FlowEditor frontend
    'http://localhost:8000',     // FlowEditor API
    'http://10.20.4.131:3000',   // Additional Chatwoot instance
    'https://stage.thumb-crowd.com',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Account-ID']
};
```

#### FlowEditor Frontend (`/vite.config.js`)
```javascript
server: {
  cors: {
    origin: [
      'http://localhost:3000',  // Chatwoot
      'http://10.20.4.131:3000', // Additional Chatwoot instance
      'https://stage.thumb-crowd.com',
      ...(process.env.VITE_CORS_ORIGIN ? process.env.VITE_CORS_ORIGIN.split(',') : [])
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Account-ID']
  },
  headers: {
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self' http://localhost:3000 http://10.20.4.131:3000"
  }
}
```

### 2. Iframe Security Headers

Both frontend and API servers are configured with appropriate security headers:
- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy` with proper `frame-ancestors` directive
- Helmet middleware with `frameSrc` and `frameAncestors` configurations

### 3. Chatwoot FlowEditor Component

Updated `/app/javascript/dashboard/routes/dashboard/flows/FlowEditor.vue`:
- Changed iframe URL from port 6000 to 3001 (frontend)
- Updated postMessage origin verification to port 3001
- Maintains existing authentication and context passing

## Deployment with PM2

### PM2 Configuration (`/ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'floweditor-ui',
      script: 'npm',
      args: 'run start',
      cwd: '/home/chatwoot/floweditor',
      env: {
        NODE_ENV: 'production',
        VITE_PORT: 3001,
        VITE_HOST: '0.0.0.0',
        VITE_CORS_ORIGIN: 'http://localhost:3000,http://10.20.4.131:3000',
        VITE_ASSET_SERVER_URL: 'http://localhost:8000'
      }
    },
    {
      name: 'floweditor-api',
      script: 'server/src/index.js',
      cwd: '/home/chatwoot/floweditor',
      env: {
        NODE_ENV: 'production',
        PORT: 6000,
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001,http://10.20.4.131:3000'
      }
    }
  ]
};
```

## Setup Instructions

### 1. Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PM2 (for production deployment)

### 2. Installation

```bash
# Install FlowEditor dependencies
cd /home/chatwoot/floweditor
npm install

# Install FlowEditor API dependencies
cd /home/chatwoot/floweditor/server
npm install
```

### 3. Development Setup

```bash
# Terminal 1: Start FlowEditor Frontend
cd /home/chatwoot/floweditor
npm run start

# Terminal 2: Start FlowEditor API
cd /home/chatwoot/floweditor/server
npm start

# Terminal 3: Start Chatwoot (if not already running)
cd /home/chatwoot/chatwoot
bundle exec rails server -p 3000
```

### 4. Production Deployment

```bash
# Create logs directory
mkdir -p /home/chatwoot/floweditor/logs

# Start with PM2
cd /home/chatwoot/floweditor
pm2 start ecosystem.config.js

# Check status
pm2 status
pm2 logs floweditor-ui
pm2 logs floweditor-api
```

## Testing the Integration

1. **Access Chatwoot**: Navigate to `http://localhost:3000`
2. **Login**: Use your Chatwoot credentials
3. **Navigate to Flows**: Click on "Flow Editor" in the sidebar
4. **Verify Integration**: 
   - FlowEditor should load in an iframe
   - Authentication context should be passed automatically
   - Navigation between flows should work
   - Saving flows should trigger proper callbacks

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check that all origins are properly configured in both frontend and API
2. **Iframe Loading Issues**: Verify security headers and CSP policies
3. **Authentication Problems**: Ensure postMessage communication is working
4. **Port Conflicts**: Make sure ports 3000, 3001, and 6000 are available

### Debug Commands

```bash
# Check running processes
ps aux | grep -E "(rails|node|npm)"

# Check port usage
netstat -tlnp | grep -E ":(3000|3001|6000)"

# View PM2 logs
pm2 logs --lines 50

# Check FlowEditor frontend logs
pm2 logs floweditor-ui --lines 20

# Check FlowEditor API logs
pm2 logs floweditor-api --lines 20
```

## Environment Variables

### FlowEditor Frontend
- `VITE_PORT`: Port for frontend server (default: 3001)
- `VITE_HOST`: Host binding (default: 0.0.0.0)
- `VITE_CORS_ORIGIN`: Comma-separated list of allowed origins
- `VITE_ASSET_SERVER_URL`: FlowEditor API URL (default: http://localhost:8000)

### FlowEditor API
- `PORT`: Port for API server (default: 6000)
- `CORS_ORIGIN`: Comma-separated list of allowed origins
- `NODE_ENV`: Environment (development/production)

## Security Considerations

1. **CORS Origins**: Only include trusted domains in CORS configuration
2. **Frame Ancestors**: Restrict iframe embedding to known hosts
3. **Authentication**: Ensure proper token validation and user context
4. **HTTPS**: Use HTTPS in production environments
5. **Environment Variables**: Store sensitive configuration in environment variables

## Monitoring

- Monitor PM2 processes: `pm2 monit`
- Check application logs regularly
- Set up health checks for all services
- Monitor resource usage (CPU, memory)

## Support

For issues related to:
- **FlowEditor**: Check FlowEditor documentation and logs
- **Chatwoot Integration**: Review iframe communication and authentication
- **Deployment**: Verify PM2 configuration and environment variables