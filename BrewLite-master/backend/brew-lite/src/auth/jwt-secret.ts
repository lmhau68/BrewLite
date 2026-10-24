/** Đọc lúc gọi (không phải lúc import) để .env nạp trong main.ts có hiệu lực cho cả ký lẫn xác thực token. */
export const getJwtSecret = () => process.env.JWT_SECRET || 'SUPER_SECRET_KEY_BREWLITE';
