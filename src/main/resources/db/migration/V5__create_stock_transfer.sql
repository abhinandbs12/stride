CREATE TABLE stock_transfer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    target_warehouse_id UUID NOT NULL REFERENCES warehouse(id),
    product_id UUID NOT NULL REFERENCES product(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    tracking_ref VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_transfer_source ON stock_transfer(source_warehouse_id);
CREATE INDEX idx_stock_transfer_target ON stock_transfer(target_warehouse_id);
CREATE INDEX idx_stock_transfer_status ON stock_transfer(status);
