import { config } from 'dotenv';

// Force dotenv to re-parse the .env file so it strips surrounding quotes
// from values, overriding any shell-exported variables that may carry them.
config({ override: true });
