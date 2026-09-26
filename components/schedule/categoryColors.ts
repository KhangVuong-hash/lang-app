/**
 * Bảng màu danh mục (study_categories.color = vị trí trong mảng). Thứ tự cố
 * định đã kiểm tra phân biệt được với người mù màu khi đặt cạnh nhau - danh mục
 * mới lấy màu kế tiếp theo thứ tự, không sinh màu ngẫu nhiên.
 * Class viết đầy đủ để Tailwind quét được (file nằm trong components/).
 */
export const CATEGORY_COLORS = [
  { hex: '#2a78d6', name: 'Xanh dương', cls: 'bg-[#2a78d6] text-white' },
  { hex: '#eb6834', name: 'Cam', cls: 'bg-[#eb6834] text-white' },
  { hex: '#1baf7a', name: 'Ngọc', cls: 'bg-[#1baf7a] text-ink' },
  { hex: '#eda100', name: 'Vàng', cls: 'bg-[#eda100] text-ink' },
  { hex: '#e87ba4', name: 'Hồng', cls: 'bg-[#e87ba4] text-ink' },
  { hex: '#008300', name: 'Xanh lá', cls: 'bg-[#008300] text-white' },
  { hex: '#4a3aa7', name: 'Tím', cls: 'bg-[#4a3aa7] text-white' },
  { hex: '#e34948', name: 'Đỏ', cls: 'bg-[#e34948] text-white' },
] as const;

/** buổi chưa phân loại */
export const UNCATEGORIZED = {
  hex: '#88A0A7',
  name: 'Chưa phân loại',
  cls: 'bg-ink-faint text-white',
};

export function categoryColor(color: number | null | undefined) {
  return color == null ? UNCATEGORIZED : (CATEGORY_COLORS[color] ?? UNCATEGORIZED);
}
