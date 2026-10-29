#!/bin/bash
# ==============================================================================
# Monogram Mail SaaS Automated Database Backup Script
# Backs up SaaS PostgreSQL & iRedMail vmail MySQL databases with retention rotation.
# ==============================================================================

set -eo pipefail

BACKUP_DIR="/var/backups/monogrammail"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}/postgres"
mkdir -p "${BACKUP_DIR}/iredmail"

echo "[$(date)] Starting Monogram Mail automated backup..."

# 1. Backup PostgreSQL SaaS database
if [ -n "$POSTGRES_DB" ]; then
    echo "[$(date)] Dumping PostgreSQL database: ${POSTGRES_DB}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "${POSTGRES_HOST:-localhost}" -U "${POSTGRES_USER:-mailoo}" "${POSTGRES_DB}" | gzip > "${BACKUP_DIR}/postgres/saas_db_${TIMESTAMP}.sql.gz"
    echo "[$(date)] PostgreSQL backup completed: ${BACKUP_DIR}/postgres/saas_db_${TIMESTAMP}.sql.gz"
fi

# 2. Backup iRedMail vmail database
if [ -n "$IREDMAIL_DB_HOST" ] && [ -n "$IREDMAIL_DB_PASSWORD" ]; then
    echo "[$(date)] Dumping iRedMail vmail database from ${IREDMAIL_DB_HOST}..."
    mysqldump -h "${IREDMAIL_DB_HOST}" -P "${IREDMAIL_DB_PORT:-3306}" -u "${IREDMAIL_DB_USER:-vmailadmin}" -p"${IREDMAIL_DB_PASSWORD}" "${IREDMAIL_DB_NAME:-vmail}" | gzip > "${BACKUP_DIR}/iredmail/vmail_${TIMESTAMP}.sql.gz"
    echo "[$(date)] iRedMail backup completed: ${BACKUP_DIR}/iredmail/vmail_${TIMESTAMP}.sql.gz"
fi

# 3. Clean up backups older than retention period
echo "[$(date)] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}/postgres" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}/iredmail" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup process finished successfully."
