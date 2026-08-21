-- V2__add_user_phone_and_refresh_token.sql
-- Adds phone column for SMS alerts (Spec §18: manager.getPhone())
-- Adds refresh_token_hash for server-side token revocation (Spec §13.3)

ALTER TABLE users ADD COLUMN phone VARCHAR(30);
ALTER TABLE users ADD COLUMN refresh_token_hash VARCHAR(255);
