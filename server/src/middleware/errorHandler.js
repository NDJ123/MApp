// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================
// Centralized error handling for the entire application.
//
// Benefits of centralized error handling:
// - Consistent error response format
// - One place to log errors
// - Clean route handlers (just throw errors, don't handle them)
// - Different error responses for development vs production
//
// This should be the LAST middleware added to Express.
// =============================================================================

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================
// Extends JavaScript's built-in Error to include HTTP status codes.
// Use this to throw errors with specific status codes.
//
// Example: throw new AppError('User not found', 404);
// =============================================================================

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Distinguishes from programming errors

    // Capture stack trace (for debugging)
    Error.captureStackTrace(this, this.constructor);
  }
}

// =============================================================================
// ERROR HANDLER MIDDLEWARE
// =============================================================================
// Express recognizes this as an error handler because it has 4 parameters.
// When you call next(error) or throw an error, Express routes here.
// =============================================================================

export const errorHandler = (err, req, res, next) => {
  // Default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error for debugging
  console.error('[Error]', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
  });

  // -------------------------------------------------------------------------
  // DEVELOPMENT: Send detailed error info
  // -------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }

  // -------------------------------------------------------------------------
  // PRODUCTION: Send minimal error info
  // -------------------------------------------------------------------------

  // Operational errors: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming errors: don't leak details to client
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

// =============================================================================
// MONGOOSE ERROR HANDLERS
// =============================================================================
// Convert Mongoose-specific errors to our AppError format
// =============================================================================

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
export const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose duplicate key error (unique constraint violation)
 */
export const handleDuplicateKeyError = (err) => {
  // Extract the duplicate field from the error message
  const field = Object.keys(err.keyValue)[0];
  const message = `${field} already exists. Please use a different value.`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose validation errors
 */
export const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  const message = `Invalid input: ${messages.join('. ')}`;
  return new AppError(message, 400);
};

// =============================================================================
// ASYNC HANDLER WRAPPER
// =============================================================================
// Wraps async route handlers to catch errors automatically.
// Without this, you'd need try/catch in every async function.
//
// Usage: router.get('/users', asyncHandler(async (req, res) => { ... }));
// =============================================================================

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    // fn(req, res, next) returns a Promise
    // If the Promise rejects (throws an error), catch it and pass to next()
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default { AppError, errorHandler, asyncHandler };
