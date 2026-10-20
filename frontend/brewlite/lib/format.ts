/** 35000 -> "35.000đ" (định dạng cố định, không phụ thuộc ICU của môi trường) */
export function formatVND(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}
