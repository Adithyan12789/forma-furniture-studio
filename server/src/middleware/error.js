export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error('[api]', err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: err.flatten() });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Image exceeds the upload limit' });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
}
