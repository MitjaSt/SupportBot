"""
PostgreSQL connection management with connection pooling.
"""

from contextlib import contextmanager
from pathlib import Path

from loguru import logger
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from src.lib.env import env

# Global connection pool
_pool: ConnectionPool | None = None


def get_db_pool() -> ConnectionPool:
    """
    Get or create the database connection pool.

    Returns:
        ConnectionPool instance
    """
    global _pool

    if _pool is None:
        conninfo = (
            f"host={env.postgres.host} "
            f"port={env.postgres.port} "
            f"dbname={env.postgres.database} "
            f"user={env.postgres.user} "
            f"password={env.postgres.password}"
        )

        _pool = ConnectionPool(
            conninfo=conninfo,
            min_size=2,
            max_size=10,
            kwargs={"row_factory": dict_row},
        )
        logger.info(f"Created PostgreSQL connection pool to {env.postgres.host}:{env.postgres.port}")

    return _pool


@contextmanager
def get_connection():
    """
    Context manager for getting a database connection from the pool.

    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    """
    pool = get_db_pool()
    with pool.connection() as conn:
        yield conn


def init_db(run_migrations: bool = True):
    """
    Initialize the database: test connection and optionally run migrations.

    Args:
        run_migrations: Whether to run pending migrations
    """
    pool = get_db_pool()

    with pool.connection() as conn, conn.cursor() as cur:
        # Test connection
        cur.execute("SELECT version()")
        version = cur.fetchone()
        logger.info(f"Connected to PostgreSQL: {version['version'][:50]}...")

        # Check pgvector extension
        cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector'")
        if cur.fetchone() is None:
            logger.warning("pgvector extension not installed - run migrations first")

    if run_migrations:
        _run_migrations()


def _run_migrations():
    """Run SQL migration files in order."""
    migrations_dir = Path(__file__).parent / "migrations"

    if not migrations_dir.exists():
        logger.warning(f"Migrations directory not found: {migrations_dir}")
        return

    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.info("No migration files found")
        return

    with get_connection() as conn, conn.cursor() as cur:
        # Create migrations tracking table if not exists
        cur.execute("""
                CREATE TABLE IF NOT EXISTS _migrations (
                    name TEXT PRIMARY KEY,
                    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
        conn.commit()

        for migration_file in migration_files:
            # Check if already applied
            cur.execute(
                "SELECT 1 FROM _migrations WHERE name = %s",
                (migration_file.name,)
            )
            if cur.fetchone():
                logger.debug(f"Migration already applied: {migration_file.name}")
                continue

            # Apply migration
            logger.info(f"Applying migration: {migration_file.name}")
            sql = migration_file.read_text()
            cur.execute(sql)

            # Record migration
            cur.execute(
                "INSERT INTO _migrations (name) VALUES (%s)",
                (migration_file.name,)
            )
            conn.commit()
            logger.info(f"Applied migration: {migration_file.name}")


def close_pool():
    """Close the connection pool gracefully."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
        logger.info("Closed PostgreSQL connection pool")
