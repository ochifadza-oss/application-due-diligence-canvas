-- =============================================================================
-- APPLICATION DUE DILIGENCE CANVAS (ADC) — MySQL 8.0 Database Schema
-- Document Reference : SRS-ADC-2026-001
-- Version            : 1.0
-- Date               : 25 April 2026
-- Author             : GMT Technology Solutions
-- =============================================================================
-- INSTRUCTIONS:
--   1. Create the database first: CREATE DATABASE adc_db CHARACTER SET utf8mb4;
--   2. Run this script: mysql -u root -p adc_db < adc_schema.sql
--   3. All tables use InnoDB engine with utf8mb4 charset
--   4. Foreign keys are enforced — insert parent records before children
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------------
-- DATABASE
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS adc_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE adc_db;

-- ===========================================================================
-- TABLE 1: users
-- Stores all system user accounts with role-based access control (RBAC)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS users (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  username         VARCHAR(80)     NOT NULL,
  email            VARCHAR(200)    NOT NULL,
  password_hash    VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash (min 12 rounds)',
  full_name        VARCHAR(150)    NOT NULL,
  role             ENUM(
                     'administrator',
                     'senior_analyst',
                     'analyst',
                     'reviewer',
                     'client_stakeholder'
                   )               NOT NULL DEFAULT 'analyst',
  is_active        TINYINT(1)      NOT NULL DEFAULT 1,
  last_login       DATETIME            NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email    (email),
  KEY idx_users_role           (role),
  KEY idx_users_active         (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System user accounts with RBAC roles';

-- ===========================================================================
-- TABLE 2: organisations
-- Stores institutional settings, branding, and configuration per organisation
-- ===========================================================================
CREATE TABLE IF NOT EXISTS organisations (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name             VARCHAR(200)    NOT NULL COMMENT 'Organisation display name',
  department       VARCHAR(200)        NULL COMMENT 'Department or directorate',
  analyst          VARCHAR(100)        NULL COMMENT 'Default analyst name for reports',
  reference_no     VARCHAR(50)         NULL COMMENT 'Internal document reference e.g. ADC-2026-001',
  financial_year   VARCHAR(20)         NULL COMMENT 'e.g. 2025/2026',
  currency_symbol  VARCHAR(5)      NOT NULL DEFAULT 'R' COMMENT 'Currency symbol — default ZAR',
  logo             LONGBLOB            NULL COMMENT 'Institutional logo binary (PNG or JPEG, max 2MB)',
  logo_mime_type   VARCHAR(30)         NULL COMMENT 'e.g. image/png',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_org_name (name(50))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Institutional settings and branding per organisation';

-- ===========================================================================
-- TABLE 3: organisation_users
-- Junction table — links users to organisations (many-to-many)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS organisation_users (
  org_id           INT UNSIGNED    NOT NULL,
  user_id          INT UNSIGNED    NOT NULL,
  joined_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (org_id, user_id),
  KEY idx_orgusers_user (user_id),
  CONSTRAINT fk_orgusers_org  FOREIGN KEY (org_id)  REFERENCES organisations (id) ON DELETE CASCADE,
  CONSTRAINT fk_orgusers_user FOREIGN KEY (user_id) REFERENCES users         (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Many-to-many: users belong to one or more organisations';

-- ===========================================================================
-- TABLE 4: scoring_criteria
-- Configurable scoring criterion labels per organisation
-- ===========================================================================
CREATE TABLE IF NOT EXISTS scoring_criteria (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  org_id           INT UNSIGNED    NOT NULL,
  criterion_index  TINYINT UNSIGNED NOT NULL COMMENT '0-based index — maps to scores.criterion_index',
  label            VARCHAR(100)    NOT NULL COMMENT 'Display label e.g. Business Fit',
  weight_pct       DECIMAL(5,2)    NOT NULL DEFAULT 25.00 COMMENT 'Percentage weight — all criteria should sum to 100',
  sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  UNIQUE KEY uq_criteria_org_idx (org_id, criterion_index),
  KEY idx_criteria_org           (org_id),
  CONSTRAINT fk_criteria_org FOREIGN KEY (org_id) REFERENCES organisations (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Configurable rating criteria labels and weights per organisation';

-- ===========================================================================
-- TABLE 5: domains
-- Business domain cells displayed on the canvas grid
-- ===========================================================================
CREATE TABLE IF NOT EXISTS domains (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  org_id           INT UNSIGNED    NOT NULL,
  name             VARCHAR(150)    NOT NULL COMMENT 'Domain display name e.g. Finance & Accounting',
  sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Display position in the grid',
  is_active        TINYINT(1)      NOT NULL DEFAULT 1 COMMENT 'Soft delete flag',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_domains_org        (org_id),
  KEY idx_domains_org_sort   (org_id, sort_order),
  CONSTRAINT fk_domains_org FOREIGN KEY (org_id) REFERENCES organisations (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Business domain cells on the due diligence canvas';

-- ===========================================================================
-- TABLE 6: applications
-- Applications (systems) registered within a domain
-- ===========================================================================
CREATE TABLE IF NOT EXISTS applications (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  domain_id        INT UNSIGNED    NOT NULL,
  name             VARCHAR(200)    NOT NULL COMMENT 'Application name',
  vendor           VARCHAR(150)        NULL COMMENT 'Vendor or supplier name',
  notes            TEXT                NULL COMMENT 'Analyst observations and notes',
  is_active        TINYINT(1)      NOT NULL DEFAULT 1 COMMENT 'Soft delete flag',
  created_by       INT UNSIGNED        NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_apps_domain      (domain_id),
  KEY idx_apps_name        (name(50)),
  KEY idx_apps_active      (is_active),
  CONSTRAINT fk_apps_domain     FOREIGN KEY (domain_id)  REFERENCES domains (id) ON DELETE CASCADE,
  CONSTRAINT fk_apps_created_by FOREIGN KEY (created_by) REFERENCES users   (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Applications registered on the canvas within a domain';

-- ===========================================================================
-- TABLE 7: scores
-- Individual criterion scores per application (1–5 scale)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS scores (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  app_id           INT UNSIGNED    NOT NULL,
  criterion_index  TINYINT UNSIGNED NOT NULL COMMENT 'Maps to scoring_criteria.criterion_index',
  score            TINYINT UNSIGNED NOT NULL COMMENT '1–5 star rating',
  scored_by        INT UNSIGNED        NULL,
  scored_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  UNIQUE KEY uq_scores_app_crit (app_id, criterion_index) COMMENT 'One score per criterion per app',
  KEY idx_scores_app            (app_id),
  KEY idx_scores_scored_by      (scored_by),
  CONSTRAINT fk_scores_app       FOREIGN KEY (app_id)    REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_scores_scored_by FOREIGN KEY (scored_by) REFERENCES users        (id) ON DELETE SET NULL,
  CONSTRAINT chk_score_range CHECK (score BETWEEN 1 AND 5)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Application scores per criterion — 1 to 5 star scale';

-- ===========================================================================
-- TABLE 8: pricing
-- Cost of ownership data per application
-- ===========================================================================
CREATE TABLE IF NOT EXISTS pricing (
  id                   INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  app_id               INT UNSIGNED    NOT NULL,
  licence_cost         DECIMAL(15,2)   NOT NULL DEFAULT 0.00 COMMENT 'Annual licence / subscription cost (ZAR)',
  maintenance_cost     DECIMAL(15,2)   NOT NULL DEFAULT 0.00 COMMENT 'Annual maintenance and support cost (ZAR)',
  implementation_cost  DECIMAL(15,2)   NOT NULL DEFAULT 0.00 COMMENT 'Once-off implementation / integration cost (ZAR)',
  score_weight         DECIMAL(5,2)    NOT NULL DEFAULT 100.00 COMMENT 'Weighting factor for portfolio scoring (%)',
  recommendation       ENUM(
                         'Keep',
                         'Upgrade',
                         'Replace',
                         'Retire',
                         'Review'
                       )                   NULL COMMENT 'Disposal / retention recommendation',
  notes                TEXT                NULL COMMENT 'Pricing notes or source references',
  captured_by          INT UNSIGNED        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricing_app    (app_id) COMMENT 'One pricing record per application',
  KEY idx_pricing_recommendation (recommendation),
  KEY idx_pricing_captured_by    (captured_by),
  CONSTRAINT fk_pricing_app         FOREIGN KEY (app_id)      REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT fk_pricing_captured_by FOREIGN KEY (captured_by) REFERENCES users        (id) ON DELETE SET NULL,
  CONSTRAINT chk_licence_cost       CHECK (licence_cost >= 0),
  CONSTRAINT chk_maintenance_cost   CHECK (maintenance_cost >= 0),
  CONSTRAINT chk_impl_cost          CHECK (implementation_cost >= 0),
  CONSTRAINT chk_score_weight       CHECK (score_weight BETWEEN 0 AND 100)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Total cost of ownership and recommendation per application';

-- ===========================================================================
-- TABLE 9: tor (Terms of Reference)
-- Formal TOR document — one per organisation
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tor (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  org_id           INT UNSIGNED    NOT NULL,
  title            VARCHAR(250)        NULL COMMENT 'Project title',
  sponsor          VARCHAR(100)        NULL COMMENT 'Project sponsor name and designation',
  project_manager  VARCHAR(100)        NULL COMMENT 'Project manager name and designation',
  start_date       DATE                NULL COMMENT 'Project commencement date',
  end_date         DATE                NULL COMMENT 'Project completion date',
  budget           DECIMAL(15,2)       NULL COMMENT 'Approved project budget (ZAR)',
  background       TEXT                NULL COMMENT 'Background and context narrative',
  purpose          TEXT                NULL COMMENT 'Purpose of the review',
  objectives       TEXT                NULL COMMENT 'Objectives — newline-separated list',
  scope            TEXT                NULL COMMENT 'Scope of work',
  exclusions       TEXT                NULL COMMENT 'Explicit exclusions from scope',
  methodology      TEXT                NULL COMMENT 'Approach, tools, and rating framework description',
  governance       TEXT                NULL COMMENT 'Reporting lines, review cadence, escalation path',
  constraints      TEXT                NULL COMMENT 'Known constraints and assumptions',
  created_by       INT UNSIGNED        NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  UNIQUE KEY uq_tor_org   (org_id) COMMENT 'One TOR document per organisation',
  KEY idx_tor_created_by  (created_by),
  CONSTRAINT fk_tor_org        FOREIGN KEY (org_id)     REFERENCES organisations (id) ON DELETE CASCADE,
  CONSTRAINT fk_tor_created_by FOREIGN KEY (created_by) REFERENCES users         (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Terms of Reference document — one per organisation';

-- ===========================================================================
-- TABLE 10: tor_deliverables
-- Individual deliverables listed in the TOR
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tor_deliverables (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  tor_id           INT UNSIGNED    NOT NULL,
  description      VARCHAR(300)    NOT NULL COMMENT 'Deliverable description',
  due_date         DATE                NULL COMMENT 'Target delivery date',
  sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_deliverables_tor (tor_id),
  CONSTRAINT fk_deliverables_tor FOREIGN KEY (tor_id) REFERENCES tor (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Deliverables listed in the Terms of Reference';

-- ===========================================================================
-- TABLE 11: tor_stakeholders
-- Stakeholders and their roles as captured in the TOR
-- ===========================================================================
CREATE TABLE IF NOT EXISTS tor_stakeholders (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  tor_id           INT UNSIGNED    NOT NULL,
  full_name        VARCHAR(150)    NOT NULL COMMENT 'Stakeholder full name',
  role             VARCHAR(100)        NULL COMMENT 'Organisational role or designation',
  responsibility   VARCHAR(300)        NULL COMMENT 'Responsibility within the review',
  sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_stakeholders_tor (tor_id),
  CONSTRAINT fk_stakeholders_tor FOREIGN KEY (tor_id) REFERENCES tor (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Stakeholders and roles captured in the Terms of Reference';

-- ===========================================================================
-- TABLE 12: queries
-- Query and issue log with full workflow tracking
-- ===========================================================================
CREATE TABLE IF NOT EXISTS queries (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  org_id           INT UNSIGNED    NOT NULL,
  app_id           INT UNSIGNED        NULL COMMENT 'Linked application — optional',
  title            VARCHAR(250)    NOT NULL COMMENT 'Short query title',
  description      TEXT                NULL COMMENT 'Detailed query description',
  priority         ENUM('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  category         ENUM(
                     'Pricing',
                     'Technical',
                     'Compliance',
                     'Functional',
                     'Contract',
                     'Other'
                   )               NOT NULL DEFAULT 'Other',
  status           ENUM(
                     'Open',
                     'In Progress',
                     'Resolved',
                     'Escalated'
                   )               NOT NULL DEFAULT 'Open',
  workflow_step    ENUM(
                     'Submitted',
                     'Acknowledged',
                     'Under Review',
                     'Response Issued',
                     'Closed'
                   )               NOT NULL DEFAULT 'Submitted',
  assignee         VARCHAR(100)        NULL COMMENT 'Assigned analyst or team name',
  assigned_user_id INT UNSIGNED        NULL COMMENT 'FK to users table if assignee is a system user',
  due_date         DATE                NULL,
  resolved_at      DATETIME            NULL COMMENT 'Timestamp when status changed to Resolved',
  raised_by        INT UNSIGNED        NULL,
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_queries_org          (org_id),
  KEY idx_queries_app          (app_id),
  KEY idx_queries_status       (status),
  KEY idx_queries_priority     (priority),
  KEY idx_queries_workflow     (workflow_step),
  KEY idx_queries_due          (due_date),
  KEY idx_queries_raised_by    (raised_by),
  KEY idx_queries_assigned_uid (assigned_user_id),
  CONSTRAINT fk_queries_org          FOREIGN KEY (org_id)           REFERENCES organisations (id) ON DELETE CASCADE,
  CONSTRAINT fk_queries_app          FOREIGN KEY (app_id)           REFERENCES applications  (id) ON DELETE SET NULL,
  CONSTRAINT fk_queries_raised_by    FOREIGN KEY (raised_by)        REFERENCES users         (id) ON DELETE SET NULL,
  CONSTRAINT fk_queries_assigned_uid FOREIGN KEY (assigned_user_id) REFERENCES users         (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Query and issue log with 5-step workflow tracking';

-- ===========================================================================
-- TABLE 13: query_responses
-- Threaded response log for each query
-- ===========================================================================
CREATE TABLE IF NOT EXISTS query_responses (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  query_id         INT UNSIGNED    NOT NULL,
  response_text    TEXT            NOT NULL COMMENT 'Response content',
  author           VARCHAR(100)    NOT NULL COMMENT 'Responder display name',
  responded_by     INT UNSIGNED        NULL COMMENT 'FK to users table if responder is a system user',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_responses_query        (query_id),
  KEY idx_responses_responded_by (responded_by),
  CONSTRAINT fk_responses_query        FOREIGN KEY (query_id)      REFERENCES queries (id) ON DELETE CASCADE,
  CONSTRAINT fk_responses_responded_by FOREIGN KEY (responded_by)  REFERENCES users   (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Threaded response log for queries — author + timestamp per entry';

-- ===========================================================================
-- TABLE 14: audit_log
-- Immutable audit trail — all create / update / delete operations
-- ===========================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED         NULL,
  org_id           INT UNSIGNED         NULL,
  action           ENUM('CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT') NOT NULL,
  table_name       VARCHAR(60)      NOT NULL COMMENT 'Affected table name',
  record_id        INT UNSIGNED         NULL COMMENT 'PK of the affected record',
  old_values       JSON                 NULL COMMENT 'Previous field values (UPDATE/DELETE)',
  new_values       JSON                 NULL COMMENT 'New field values (CREATE/UPDATE)',
  ip_address       VARCHAR(45)          NULL COMMENT 'Client IP address (supports IPv6)',
  user_agent       VARCHAR(300)         NULL COMMENT 'Browser / client user agent string',
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  --
  PRIMARY KEY (id),
  KEY idx_audit_user       (user_id),
  KEY idx_audit_org        (org_id),
  KEY idx_audit_action     (action),
  KEY idx_audit_table      (table_name),
  KEY idx_audit_record     (record_id),
  KEY idx_audit_created    (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users         (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_org  FOREIGN KEY (org_id)  REFERENCES organisations (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable audit trail — all data-modifying operations logged for POPIA compliance';

-- ===========================================================================
-- TABLE 15: refresh_tokens
-- JWT refresh token store for session management
-- ===========================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  user_id          INT UNSIGNED    NOT NULL,
  token_hash       VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash of the refresh token',
  expires_at       DATETIME        NOT NULL,
  revoked          TINYINT(1)      NOT NULL DEFAULT 0,
  issued_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used        DATETIME            NULL,
  ip_address       VARCHAR(45)         NULL,
  --
  PRIMARY KEY (id),
  KEY idx_tokens_user       (user_id),
  KEY idx_tokens_expires    (expires_at),
  KEY idx_tokens_revoked    (revoked),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='JWT refresh token store — supports session revocation';

-- ===========================================================================
-- VIEWS
-- ===========================================================================

-- View: application summary with average score and TCO
CREATE OR REPLACE VIEW vw_application_summary AS
SELECT
  a.id                                           AS app_id,
  a.name                                         AS app_name,
  a.vendor,
  d.id                                           AS domain_id,
  d.name                                         AS domain_name,
  o.id                                           AS org_id,
  o.name                                         AS org_name,
  ROUND(AVG(s.score), 2)                         AS avg_score,
  COUNT(s.id)                                    AS criteria_rated,
  COALESCE(p.licence_cost, 0)
    + COALESCE(p.maintenance_cost, 0)
    + COALESCE(p.implementation_cost, 0)         AS total_cost,
  p.recommendation,
  CASE
    WHEN AVG(s.score) >= 3.5 THEN 'Adequate'
    WHEN AVG(s.score) >= 2.0 THEN 'Review'
    WHEN AVG(s.score) >  0   THEN 'Critical'
    ELSE 'Unrated'
  END                                            AS status_label
FROM applications  a
JOIN domains       d ON a.domain_id = d.id
JOIN organisations o ON d.org_id    = o.id
LEFT JOIN scores   s ON s.app_id    = a.id
LEFT JOIN pricing  p ON p.app_id    = a.id
WHERE a.is_active = 1
GROUP BY
  a.id, a.name, a.vendor,
  d.id, d.name,
  o.id, o.name,
  p.licence_cost, p.maintenance_cost,
  p.implementation_cost, p.recommendation;

-- View: domain summary with aggregated scores and app counts
CREATE OR REPLACE VIEW vw_domain_summary AS
SELECT
  d.id                                           AS domain_id,
  d.name                                         AS domain_name,
  d.org_id,
  o.name                                         AS org_name,
  COUNT(DISTINCT a.id)                           AS total_apps,
  COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN a.id END) AS rated_apps,
  ROUND(AVG(s.score), 2)                         AS avg_score,
  COALESCE(SUM(p.licence_cost), 0)
    + COALESCE(SUM(p.maintenance_cost), 0)
    + COALESCE(SUM(p.implementation_cost), 0)    AS total_domain_cost
FROM domains       d
JOIN organisations o ON d.org_id    = o.id
LEFT JOIN applications a ON a.domain_id = d.id AND a.is_active = 1
LEFT JOIN scores       s ON s.app_id    = a.id
LEFT JOIN pricing      p ON p.app_id    = a.id
WHERE d.is_active = 1
GROUP BY d.id, d.name, d.org_id, o.name;

-- View: open queries per organisation
CREATE OR REPLACE VIEW vw_open_queries AS
SELECT
  q.*,
  a.name  AS app_name,
  o.name  AS org_name
FROM queries       q
JOIN organisations o ON q.org_id = o.id
LEFT JOIN applications a ON q.app_id = a.id
WHERE q.status IN ('Open', 'In Progress', 'Escalated')
ORDER BY
  FIELD(q.priority, 'High', 'Medium', 'Low'),
  q.due_date ASC;

-- ===========================================================================
-- SEED DATA — Default scoring criteria for first organisation
-- ===========================================================================
INSERT INTO organisations (name, department, analyst, reference_no, financial_year, currency_symbol)
VALUES ('My Organisation', 'ICT Directorate', 'Lead Analyst', 'ADC-2026-001', '2025/2026', 'R');

INSERT INTO scoring_criteria (org_id, criterion_index, label, weight_pct, sort_order) VALUES
(1, 0, 'Business Fit',      25.00, 0),
(1, 1, 'Technical Health',  25.00, 1),
(1, 2, 'Cost Efficiency',   25.00, 2),
(1, 3, 'Risk Level',        25.00, 3);

INSERT INTO domains (org_id, name, sort_order) VALUES
(1, 'Finance & Accounting',  0),
(1, 'Human Resources',       1),
(1, 'Operations',            2),
(1, 'Customer Management',   3),
(1, 'Supply Chain',          4),
(1, 'IT Infrastructure',     5),
(1, 'Compliance & Risk',     6),
(1, 'Analytics & BI',        7),
(1, 'Marketing & Sales',     8);

-- ===========================================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ===========================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ===========================================================================
-- END OF SCHEMA SCRIPT — adc_schema.sql
-- ADC System v1.0 | SRS-ADC-2026-001 | GMT Technology Solutions
-- ===========================================================================
