const mongoose = require('mongoose');

/**
 * Check if MongoDB connection is ready
 * @returns {boolean}
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Wait for MongoDB connection to be ready
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>}
 */
const waitForConnection = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (isConnected()) {
      return resolve(true);
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isConnected()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('MongoDB connection timeout'));
      }
    }, 100);
  });
};

/**
 * Execute a MongoDB operation with connection check and timeout
 * @param {Function} operation - The MongoDB operation to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<any>}
 */
const executeWithTimeout = async (operation, timeout = 20000) => {
  // Wait for connection if not ready
  if (!isConnected()) {
    await waitForConnection(5000);
  }

  if (!isConnected()) {
    throw new Error('MongoDB connection is not ready');
  }

  // Execute with timeout
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database operation timed out')), timeout)
    )
  ]);
};

module.exports = {
  isConnected,
  waitForConnection,
  executeWithTimeout
};

