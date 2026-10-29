-- iRedMail vmail Database Schema Initialization Script for Staging / Production
CREATE DATABASE IF NOT EXISTS vmail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vmail;

-- 1. Domains Table
CREATE TABLE IF NOT EXISTS domain (
    domain VARCHAR(255) NOT NULL DEFAULT '',
    description VARCHAR(255) NOT NULL DEFAULT '',
    disquota BIGINT NOT NULL DEFAULT 0,
    maxquota BIGINT NOT NULL DEFAULT 0,
    mailboxes INT NOT NULL DEFAULT 0,
    aliases INT NOT NULL DEFAULT 0,
    maxquota_count INT NOT NULL DEFAULT 0,
    transport VARCHAR(255) NOT NULL DEFAULT 'dovecot',
    settings TEXT,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Mailboxes Table
CREATE TABLE IF NOT EXISTS mailbox (
    username VARCHAR(255) NOT NULL DEFAULT '',
    password VARCHAR(255) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL DEFAULT '',
    language VARCHAR(5) NOT NULL DEFAULT 'en_US',
    mailboxformat VARCHAR(10) NOT NULL DEFAULT 'maildir',
    mailboxfolder VARCHAR(10) NOT NULL DEFAULT '',
    storagebasedirectory VARCHAR(255) NOT NULL DEFAULT '/var/vmail',
    storagenode VARCHAR(255) NOT NULL DEFAULT 'vmail1',
    maildir VARCHAR(255) NOT NULL DEFAULT '',
    quota BIGINT NOT NULL DEFAULT 0,
    domain VARCHAR(255) NOT NULL DEFAULT '',
    transport VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(255) NOT NULL DEFAULT '',
    rank VARCHAR(255) NOT NULL DEFAULT 'normal',
    employeeid VARCHAR(255) NOT NULL DEFAULT '',
    isadmin TINYINT(1) NOT NULL DEFAULT 0,
    isglobalsuperadmin TINYINT(1) NOT NULL DEFAULT 0,
    enablesmtp TINYINT(1) NOT NULL DEFAULT 1,
    enablesmtpsecured TINYINT(1) NOT NULL DEFAULT 1,
    enablepop3 TINYINT(1) NOT NULL DEFAULT 1,
    enablepop3secured TINYINT(1) NOT NULL DEFAULT 1,
    enableimap TINYINT(1) NOT NULL DEFAULT 1,
    enableimapsecured TINYINT(1) NOT NULL DEFAULT 1,
    enabledeliver TINYINT(1) NOT NULL DEFAULT 1,
    enablelda TINYINT(1) NOT NULL DEFAULT 1,
    enablemanagesieve TINYINT(1) NOT NULL DEFAULT 1,
    enablemanagesievesecured TINYINT(1) NOT NULL DEFAULT 1,
    enablesieve TINYINT(1) NOT NULL DEFAULT 1,
    enablesievesecured TINYINT(1) NOT NULL DEFAULT 1,
    enableinternal TINYINT(1) NOT NULL DEFAULT 1,
    settings TEXT,
    passwordlastchange DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (username),
    KEY domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Aliases Table
CREATE TABLE IF NOT EXISTS alias (
    address VARCHAR(255) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL DEFAULT '',
    accesspolicy VARCHAR(30) NOT NULL DEFAULT '',
    maxquota BIGINT NOT NULL DEFAULT 0,
    domain VARCHAR(255) NOT NULL DEFAULT '',
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (address),
    KEY domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Forwardings Table (Used for both aliases and forwarders in iRedMail 0.9.7+)
CREATE TABLE IF NOT EXISTS forwardings (
    id BIGINT AUTO_INCREMENT,
    address VARCHAR(255) NOT NULL DEFAULT '',
    forwarding VARCHAR(255) NOT NULL DEFAULT '',
    domain VARCHAR(255) NOT NULL DEFAULT '',
    dest_domain VARCHAR(255) NOT NULL DEFAULT '',
    is_maillist TINYINT(1) NOT NULL DEFAULT 0,
    is_list TINYINT(1) NOT NULL DEFAULT 0,
    is_forwarding TINYINT(1) NOT NULL DEFAULT 0,
    is_alias TINYINT(1) NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY address (address, forwarding),
    KEY domain (domain),
    KEY dest_domain (dest_domain),
    KEY is_maillist (is_maillist)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Used Quota Table (Updated by Dovecot dict quota)
CREATE TABLE IF NOT EXISTS used_quota (
    username VARCHAR(255) NOT NULL DEFAULT '',
    bytes BIGINT NOT NULL DEFAULT 0,
    messages BIGINT NOT NULL DEFAULT 0,
    domain VARCHAR(255) NOT NULL DEFAULT '',
    PRIMARY KEY (username),
    KEY domain (domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
