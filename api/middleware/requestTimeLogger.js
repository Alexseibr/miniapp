function requestTimeLogger(thresholdMs = 500) {
  return function logger(req, res, next) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      if (durationMs > thresholdMs) {
        const userId = req.currentUser?._id || req.user?._id || req.currentUser?.id;
        console.warn(
          `[SLOW ${durationMs.toFixed(1)}ms] ${req.method} ${req.originalUrl} | user: ${userId || 'anon'} | query: ${JSON.stringify(req.query)}`,
        );
      }
    });

    next();
  };
}

module.exports = { requestTimeLogger };
