import { connectDB } from './config/db.js';
import app from './app.js';
import { env } from './config/env.js';

connectDB().then(() => {
  app.listen(env.PORT, () => console.log(`Backend running on :${env.PORT}`));
});
