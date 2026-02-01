// =============================================================================
// SERVER ENTRY POINT - MApp Chat Application
// =============================================================================
// This is where our backend application starts. It sets up:
// 1. Express - our web server framework for handling HTTP requests
// 2. MongoDB - our database connection
// 3. Socket.io - real-time bidirectional communication
// 4. Middleware - functions that process requests before they reach routes
// =============================================================================

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------

// dotenv loads environment variables from .env file into process.env
// Using 'dotenv/config' ensures it runs before other imports in ES modules
import 'dotenv/config';

// Node.js built-in modules
import { createServer } from 'http';  // Required to attach Socket.io to Express

// Express and middleware
import express from 'express';
import cors from 'cors';              // Cross-Origin Resource Sharing
import helmet from 'helmet';          // Security headers
// Note: express-mongo-sanitize removed - not compatible with Express 5
import rateLimit from 'express-rate-limit';          // Prevent abuse

// Database
import mongoose from 'mongoose';

// Socket.io for real-time features
import { Server as SocketServer } from 'socket.io';

// Routes
import authRoutes from './routes/authRoutes.js';
import inviteRoutes from './routes/inviteRoutes.js';
import userRoutes from './routes/userRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import clubRoutes from './routes/clubRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';

// Socket handlers
import { setupSocketHandlers } from './socket/socketHandlers.js';

// Error handler
import { errorHandler } from './middleware/errorHandler.js';

// -----------------------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------------------

// Get values from environment variables, with sensible defaults
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mapp';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Parse allowed origins - supports comma-separated list for multiple origins
const getAllowedOrigins = () => {
  if (NODE_ENV === 'development') {
    return [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'];
  }
  // In production, allow CLIENT_URL and any .onrender.com subdomain
  const origins = [CLIENT_URL];
  if (process.env.ADDITIONAL_ORIGINS) {
    origins.push(...process.env.ADDITIONAL_ORIGINS.split(',').map(o => o.trim()));
  }
  return origins;
};

const allowedOrigins = getAllowedOrigins();

// -----------------------------------------------------------------------------
// EXPRESS APP SETUP
// -----------------------------------------------------------------------------

// Create the Express application
const app = express();

// Create HTTP server - we need this to attach both Express AND Socket.io
// Express alone can't handle WebSocket connections
const httpServer = createServer(app);

// -----------------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------------
// Middleware are functions that run on every request, in order.
// They can modify the request, send a response, or pass to the next middleware.
// Order matters! Security middleware should come first.
// -----------------------------------------------------------------------------

// Security: Set various HTTP headers to protect against common attacks
// - X-Content-Type-Options: prevents MIME type sniffing
// - X-Frame-Options: prevents clickjacking
// - And many more...
app.use(helmet());

// Security: Enable CORS (Cross-Origin Resource Sharing)
// This allows our React frontend (different origin) to make requests to this server
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Check if origin is in allowed list or matches .onrender.com pattern
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      console.log('[CORS] Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,            // Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Club-Id'],
};
app.use(cors(corsOptions));

// Parse JSON request bodies
// When someone sends JSON data, this makes it available as req.body
// Increased limit to 5MB to support base64 avatar uploads
app.use(express.json({ limit: '5mb' }));

// Parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Note: NoSQL injection sanitization removed for Express 5 compatibility
// For production, consider using mongoose schema validation instead

// Security: Rate limiting to prevent brute force attacks
// Limits each IP to 100 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,      // Return rate limit info in headers
  legacyHeaders: false,       // Disable X-RateLimit-* headers
});
app.use('/api', limiter);     // Only apply to API routes

// -----------------------------------------------------------------------------
// SOCKET.IO SETUP
// -----------------------------------------------------------------------------
// Socket.io enables real-time, bidirectional communication.
// Unlike HTTP (request -> response), sockets stay open for continuous messaging.
// -----------------------------------------------------------------------------

const io = new SocketServer(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      // Check if origin is in allowed list or matches .onrender.com pattern
      if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Ping every 25 seconds to detect dead connections
  pingTimeout: 60000,
  pingInterval: 25000,
  // Allow both transports for better compatibility
  transports: ['websocket', 'polling'],
});

// Make io available to routes (we'll use this later for emitting events)
app.set('io', io);

// Set up Socket.io handlers (authentication, messaging, etc.)
setupSocketHandlers(io);

// -----------------------------------------------------------------------------
// API ROUTES
// -----------------------------------------------------------------------------
// Routes define what happens when someone requests a specific URL
// We'll add actual route files in Phase 2
// -----------------------------------------------------------------------------

// Health check endpoint - useful for monitoring and deployment
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MApp server is running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/superadmin', superadminRoutes);

// 404 handler - for routes that don't exist
// Using {*splat} syntax for Express 5 / newer path-to-regexp compatibility
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// -----------------------------------------------------------------------------
// GLOBAL ERROR HANDLER
// -----------------------------------------------------------------------------
// This catches any errors thrown in our routes/middleware
// Must be the LAST middleware added
// Uses our custom error handler from middleware/errorHandler.js
// -----------------------------------------------------------------------------

app.use(errorHandler);

// -----------------------------------------------------------------------------
// DATABASE CONNECTION
// -----------------------------------------------------------------------------
// Mongoose is an ODM (Object Document Mapper) that makes working with
// MongoDB easier by providing schemas, validation, and query building.
// -----------------------------------------------------------------------------

const connectDatabase = async () => {
  try {
    // Mongoose options for better connection handling
    const options = {
      // These options are no longer needed in Mongoose 6+ but don't hurt
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    };

    await mongoose.connect(MONGO_URI, options);
    console.log(`[Database] Connected to MongoDB at ${MONGO_URI}`);
  } catch (error) {
    console.error('[Database] Connection failed:', error.message);
    // Exit with failure code - let the process manager restart us
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.log('[Database] MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[Database] MongoDB error:', err);
});

// -----------------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------------

const startServer = async () => {
  // Connect to database first
  await connectDatabase();

  // Start listening for requests
  httpServer.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log(`  MApp Server Started`);
    console.log('='.repeat(60));
    console.log(`  Environment:  ${NODE_ENV}`);
    console.log(`  Port:         ${PORT}`);
    console.log(`  API URL:      http://localhost:${PORT}/api`);
    console.log(`  Health:       http://localhost:${PORT}/api/health`);
    console.log(`  Client URL:   ${CLIENT_URL}`);
    console.log('='.repeat(60));
  });
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log('[Server] Server closed');
      process.exit(0);
    });
  });
});

// Start the server!
startServer();
