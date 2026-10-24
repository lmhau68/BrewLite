/**
 * Size đồ uống — nguồn sự thật duy nhất cho cả validate DTO lẫn tính giá.
 * Frontend lấy danh sách này qua GET /options (không hard-code phụ thu).
 */
export const SIZE_OPTIONS = [
  { id: 'S', label: 'Nhỏ', extra: 0 },
  { id: 'M', label: 'Vừa', extra: 5000 },
  { id: 'L', label: 'Lớn', extra: 10000 },
] as const;

export const SIZE_IDS = SIZE_OPTIONS.map((s) => s.id);

export function sizeSurcharge(size: string): number {
  return SIZE_OPTIONS.find((s) => s.id === size)?.extra ?? 0;
}
