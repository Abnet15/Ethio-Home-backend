require('dotenv').config({ path: './config.env' });
const path=require('path');
const express = require('express');
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
// Use DATABASE (MongoDB Atlas) if available, otherwise fall back to MONGODB_URI
const dbURI = process.env.DATABASE || process.env.MONGODB_URI;

if (!dbURI) {
  console.error('Neither DATABASE nor MONGODB_URI is defined in environment variables!');
  process.exit(1);
}

// Log which connection string is being used (without credentials)
const dbInfo = dbURI.includes('@') 
  ? dbURI.split('@')[1] 
  : dbURI;
console.log('Using MongoDB connection:', dbInfo);

// MongoDB connection options (Mongoose 7.x compatible)
// Note: useNewUrlParser and useUnifiedTopology are deprecated in Mongoose 7.x
// bufferMaxEntries and bufferCommands are not supported in Mongoose 7.x
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  connectTimeoutMS: 30000, // 30 seconds
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  retryWrites: true,
  w: 'majority'
};

mongoose.connect(dbURI, mongooseOptions)
.then(() => {
  console.log('DB connection successful!');
  console.log('Connected to MongoDB');
  // Don't log the full URI for security
  if (dbURI.includes('@')) {
    const dbName = dbURI.split('/').pop().split('?')[0];
    console.log('Database:', dbName);
  }
})
.catch((err) => {
  console.error('MongoDB connection error:', err.message);
  console.error('Please check your database connection and try again.');
  console.error('Make sure MONGODB_URI is correctly set in config.env');
  process.exit(1);
});

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;
const server= app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}...`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  })
});
