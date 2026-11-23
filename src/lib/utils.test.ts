import { describe, it, expect } from "vitest";
import { money } from "@/lib/utils";

describe("Cart and Order Calculations", () => {
  it("calculates subtotal correctly", () => {
    const items = [
      { price: 10.00, quantity: 2 },
      { price: 25.50, quantity: 1 },
      { price: 5.00, quantity: 3 },
    ];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    expect(subtotal).toBe(20.00 + 25.50 + 15.00);
  });

  it("applies percentage discount correctly", () => {
    const price = 100.00;
    const discountPercent = 10;
    const discount = price * discountPercent / 100;
    const finalPrice = Math.max(0, price - Math.min(price, discount));
    expect(finalPrice).toBe(90.00);
  });

  it("applies fixed discount correctly", () => {
    const price = 50.00;
    const discountValue = 10.00;
    const finalPrice = Math.max(0, price - Math.min(price, discountValue));
    expect(finalPrice).toBe(40.00);
  });

  it("caps discount at item price", () => {
    const price = 10.00;
    const discountPercent = 200;
    const discount = price * discountPercent / 100;
    const finalPrice = Math.max(0, price - Math.min(price, discount));
    expect(finalPrice).toBe(0);
  });

  it("calculates order total with coupon", () => {
    const subtotal = 100.00;
    const offerDiscount = 5.00;
    const couponDiscount = 10.00;
    const total = Math.max(0, subtotal - offerDiscount - couponDiscount);
    expect(total).toBe(85.00);
  });

  it("calculates line total correctly", () => {
    const unitPrice = 25.00;
    const quantity = 3;
    const lineTotal = unitPrice * quantity;
    expect(lineTotal).toBe(75.00);
  });

  it("handles coupon minimum order validation", () => {
    const subtotal = 50.00;
    const couponMinimum = 100.00;
    const meetsMinimum = subtotal >= couponMinimum;
    expect(meetsMinimum).toBe(false);
  });

  it("formats money with correct precision", () => {
    expect(money(10)).toBe("$10.00");
    expect(money(10.5)).toBe("$10.50");
    expect(money(0)).toBe("$0.00");
    expect(money(99.99)).toBe("$99.99");
    expect(money(1000)).toBe("$1,000.00");
  });
});
