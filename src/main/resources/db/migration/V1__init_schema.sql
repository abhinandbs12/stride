-- V1__init_schema.sql
-- STRIDE core schema — 8 tables, 5 indexes, CHECK constraints
-- Spec §14 — exact DDL

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'WH_MANAGER', 'SUPPLIER')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouse (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) UNIQUE NOT NULL,
    address     VARCHAR(500),
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    cost_factor DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table for User <-> Warehouse many-to-many (manager assignment)
CREATE TABLE warehouse_manager (
    warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (warehouse_id, user_id)
);

CREATE TABLE product (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku               VARCHAR(100) UNIQUE NOT NULL,
    name              VARCHAR(255) NOT NULL,
    category          VARCHAR(100),
    unit_weight_kg    DOUBLE PRECISION,
    reorder_threshold INT NOT NULL DEFAULT 10
);

-- The single most important table — optimistic locking via 'version' column
CREATE TABLE stock_item (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id      UUID NOT NULL REFERENCES warehouse(id),
    product_id        UUID NOT NULL REFERENCES product(id),
    quantity          INT NOT NULL CHECK (quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    batch_expiry      DATE,
    version           BIGINT NOT NULL DEFAULT 0,
    UNIQUE (warehouse_id, product_id)
);

CREATE TABLE customer (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name      VARCHAR(255) NOT NULL,
    email     VARCHAR(255),
    phone     VARCHAR(30),
    address   VARCHAR(500),
    latitude  DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);

CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id),
    status      VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_line (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id         UUID NOT NULL REFERENCES product(id),
    quantity_requested INT NOT NULL CHECK (quantity_requested > 0)
);

CREATE TABLE order_allocation (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_line_id       UUID NOT NULL REFERENCES order_line(id) ON DELETE CASCADE,
    warehouse_id        UUID NOT NULL REFERENCES warehouse(id),
    quantity_allocated  INT NOT NULL CHECK (quantity_allocated > 0),
    score_breakdown     JSONB,
    status              VARCHAR(20) NOT NULL DEFAULT 'ALLOCATED'
);

-- Performance indexes
CREATE INDEX idx_stock_item_warehouse_product ON stock_item(warehouse_id, product_id);
CREATE INDEX idx_order_status ON orders(status);
CREATE INDEX idx_order_line_order ON order_line(order_id);
CREATE INDEX idx_allocation_order_line ON order_allocation(order_line_id);
CREATE INDEX idx_stock_reorder_check ON stock_item(product_id) WHERE reserved_quantity > 0;
