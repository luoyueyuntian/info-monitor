// Unset DATABASE_URL to ensure tests run in mock mode
// This prevents getDatabase() from returning a non-null Kysely instance
delete process.env.DATABASE_URL;
