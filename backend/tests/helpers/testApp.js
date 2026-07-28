require('express-async-errors');
const express = require('express');

// Mounts a router the same way server.js does, including the JSON body parser
// and the global error handler, so route-level rejections surface as 500s.
const createTestApp = (mountPath, router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  });
  return app;
};

module.exports = { createTestApp };
