-- Đồng bộ CSDL với giao diện: menu cần metadata sản phẩm, đơn hàng cần lưu
-- thông tin người nhận và lựa chọn size/topping (xem ADR-007).

ALTER TABLE "Product"
    ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "category" TEXT NOT NULL DEFAULT 'coffee',
    ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '🧋',
    ADD COLUMN "customizable" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "bestSeller" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
    ADD COLUMN "customerName" TEXT,
    ADD COLUMN "customerPhone" TEXT,
    ADD COLUMN "address" TEXT,
    ADD COLUMN "note" TEXT;

ALTER TABLE "OrderItem"
    ADD COLUMN "toppings" JSONB,
    ADD COLUMN "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
