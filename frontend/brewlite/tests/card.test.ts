import { describe, expect, it } from "vitest";
import {
  DEMO_CARD,
  EMPTY_CARD,
  formatCardCvv,
  formatCardExpiry,
  formatCardNumber,
  hasCardErrors,
  passesLuhn,
  validateCard,
  validateExpiry,
} from "@/lib/card";

const NOW = new Date("2026-10-25T00:00:00.000Z");

describe("định dạng khi gõ", () => {
  it("chia số thẻ thành nhóm 4 chữ số", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("4242-4242-4242-4242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("abc")).toBe("");
    expect(formatCardNumber("42424242424242424242")).toBe("4242 4242 4242 4242 424");
  });

  it("thêm dấu / cho hạn thẻ MM/YY", () => {
    expect(formatCardExpiry("12")).toBe("12");
    expect(formatCardExpiry("1228")).toBe("12/28");
    expect(formatCardExpiry("12/28")).toBe("12/28");
    expect(formatCardExpiry("12/2899")).toBe("12/28");
  });

  it("chỉ giữ chữ số cho CVV", () => {
    expect(formatCardCvv("12a3")).toBe("123");
    expect(formatCardCvv("123456")).toBe("1234");
  });
});

describe("checksum Luhn", () => {
  it("nhận số thẻ hợp lệ", () => {
    expect(passesLuhn("4242424242424242")).toBe(true);
    expect(passesLuhn("4111111111111111")).toBe(true);
  });

  it("từ chối số thẻ sai", () => {
    expect(passesLuhn("4242424242424243")).toBe(false);
    expect(passesLuhn("123")).toBe(false);
    expect(passesLuhn("abcd")).toBe(false);
  });
});

describe("kiểm tra hạn thẻ", () => {
  it("chấp nhận hạn thẻ còn hiệu lực", () => {
    expect(validateExpiry("12/28", NOW)).toBeUndefined();
  });

  it("báo lỗi khi thiếu, sai định dạng hoặc đã hết hạn", () => {
    expect(validateExpiry("", NOW)).toBe("Vui lòng nhập hạn thẻ.");
    expect(validateExpiry("1228", NOW)).toBe("Hạn thẻ phải có dạng MM/YY.");
    expect(validateExpiry("13/28", NOW)).toBe("Tháng của hạn thẻ không hợp lệ.");
    expect(validateExpiry("01/20", NOW)).toBe("Thẻ đã hết hạn.");
  });
});

describe("kiểm tra thông tin thẻ", () => {
  it("báo lỗi cho cả 4 ô khi người dùng chưa nhập gì", () => {
    const errors = validateCard(EMPTY_CARD, NOW);
    expect(errors).toEqual({
      number: "Vui lòng nhập số thẻ.",
      holder: "Vui lòng nhập tên chủ thẻ.",
      expiry: "Vui lòng nhập hạn thẻ.",
      cvv: "Vui lòng nhập CVV.",
    });
    expect(hasCardErrors(errors)).toBe(true);
  });

  it("không báo lỗi khi thẻ hợp lệ", () => {
    const errors = validateCard(DEMO_CARD, NOW);
    expect(errors).toEqual({});
    expect(hasCardErrors(errors)).toBe(false);
  });

  it("không còn lỗi khi ô đã sửa được gán undefined", () => {
    expect(hasCardErrors({ number: undefined, holder: undefined })).toBe(false);
    expect(hasCardErrors({ number: undefined, cvv: "Vui lòng nhập CVV." })).toBe(true);
  });

  it("báo lỗi khi số thẻ quá ngắn, sai checksum hoặc CVV sai định dạng", () => {
    expect(validateCard({ ...DEMO_CARD, number: "4242" }, NOW).number).toBe(
      "Số thẻ phải có 13-19 chữ số.",
    );
    expect(validateCard({ ...DEMO_CARD, number: "4242424242424243" }, NOW).number).toBe(
      "Số thẻ không hợp lệ, hãy kiểm tra lại.",
    );
    expect(validateCard({ ...DEMO_CARD, cvv: "12" }, NOW).cvv).toBe("CVV phải gồm 3-4 chữ số.");
    expect(validateCard({ ...DEMO_CARD, holder: "A" }, NOW).holder).toBe("Tên chủ thẻ quá ngắn.");
  });
});
