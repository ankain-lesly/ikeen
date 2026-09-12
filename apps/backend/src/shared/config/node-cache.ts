import NodeCache from "node-cache";

// Cache configuration
export const cacheConfig = {
  stdTTL: 900, // 15 minutes default TTL
  // checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance
  maxKeys: 10000, // Maximum number of keys
};

// Initialize cache instance
const nodeCache = new NodeCache(cacheConfig);

export default nodeCache;
