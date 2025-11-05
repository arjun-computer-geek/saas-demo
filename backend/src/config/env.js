export const env = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  COOKIE_NAME: 'session',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/saas-demo',
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
