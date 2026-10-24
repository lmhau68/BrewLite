-- Product: metadata hiển thị menu + cờ cho phép chọn size/topping
ALTER TABLE "Product"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'coffee',
  ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '🧋',
  ADD COLUMN "customizable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bestSeller" BOOLEAN NOT NULL DEFAULT false;

-- Topping
CREATE TABLE "Topping" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Topping_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Topping_code_key" ON "Topping"("code");

-- Order: thông tin người nhận
ALTER TABLE "Order"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "note" TEXT;

-- OrderItem: topping đã chọn (snapshot)
ALTER TABLE "OrderItem" ADD COLUMN "toppings" JSONB NOT NULL DEFAULT '[]';
