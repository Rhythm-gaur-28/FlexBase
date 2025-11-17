const redisClient = require('../redisClient');

const cacheMiddleware = (keyPrefix, ttlSeconds = 60) => async (req, res, next) => {
  const key = keyPrefix + req.params.category;

  try {
    const cachedData = await redisClient.get(key);

    if (cachedData) {
      // Cache exists
      console.log(`⚡ Cache hit for key: ${key}`);
      return res.json(JSON.parse(cachedData));
    } else {
      // No cache yet
      console.log(`🕓 Cache miss for key: ${key}`);
    }

    // Override res.json to store data in Redis after DB query
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      redisClient.setEx(key, ttlSeconds, JSON.stringify(body))
        .then(() => console.log(`💾 Cached response for key: ${key}`))
        .catch(err => console.error('Redis setEx error:', err));
      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('Redis cache error:', err);
    next();
  }
};

module.exports = cacheMiddleware;
