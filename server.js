require('dotenv').config({ path: './config.env' });
const path=require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const globalErrorHandler = require('./controllers/errorController');
const AppError=require('./utils/appError')
const socketAuth = require('./utils/socketAuth');
const propertyRoutes = require('./routes/propertyRoutes');
const userRoutes = require('./routes/userRoutes');
const interestRoutes = require('./routes/interestRoutes');
const sellingRoutes = require('./routes/sellingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const subscriptionRoutes=require('./routes/subscription');
const messageRoutes = require('./routes/messageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err);
  process.exit(1);
});

const app = express();
const server = http.createServer(app);

// Socket.io setup for realtime messaging with JWT authentication
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

global.io = io;

// Store online users
const onlineUsers = new Map(); // userId -> socketId

// Socket authentication middleware
io.use(socketAuth);

io.on('connection', async (socket) => {
  const userId = socket.userId;
  const user = socket.user;
  
  if (!userId || !user) {
    console.log('Socket connection rejected: Invalid authentication');
    socket.disconnect();
    return;
  }

  // Join user's personal room
  socket.join(userId);
  
  // Track online user
  onlineUsers.set(userId, socket.id);
  
  // Notify user is online
  socket.broadcast.emit('user:online', { userId, user: { _id: user._id, name: user.name, photo: user.photo } });
  
  console.log(`✅ Socket connected for user ${userId} (${user.name})`);

  // Handle typing indicators
  socket.on('message:typing', (data) => {
    const { recipientId, isTyping } = data;
    if (recipientId && recipientId !== userId) {
      socket.to(recipientId).emit('message:typing', {
        senderId: userId,
        sender: { _id: user._id, name: user.name, photo: user.photo },
        isTyping
      });
    }
  });

  // Handle message read receipts
  socket.on('message:read', (data) => {
    const { messageId, senderId } = data;
    if (senderId && senderId !== userId) {
      socket.to(senderId).emit('message:read', {
        messageId,
        readBy: userId,
        readAt: new Date()
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    socket.broadcast.emit('user:offline', { userId });
    console.log(`❌ Socket disconnected for user ${userId}`);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for user ${userId}:`, error);
  });
});

// Helper function to get online users
global.getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

// Helper function to check if user is online
global.isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "http:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  }
})); // Set security HTTP headers

// Configure CORS for image serving
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
})); 
app.options('*', cors({
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parser
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); 

// Serve static files with proper CORS headers
app.use('/img', express.static(path.join(__dirname, 'uploads/img'), {
  setHeaders: (res, path, stat) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  }
}));

// Additional CORS preflight for image requests
app.options('/img/*', cors());


// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
    ]
  })
);

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10000 ,
  message:"Too many requests. please try again later!"
});
app.use(limiter);

console.log(process.env.NODE_ENV);
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/interest', interestRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/selling', sellingRoutes);
app.use('/api/v1/subscription',subscriptionRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/contact', contactRoutes);
app.use('/api/v1/notifications', notificationRoutes);


// Handle 404 routes
app.all('*',(req, res, next) => {
 next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
app.use(globalErrorHandler);

// Connect to MongoDB
const dbURI = process.env.DATABASE;
mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('DB connection successful!');
  console.log('Connected to:', dbURI);
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  console.error('Please check your database connection and try again.');
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  })
});
