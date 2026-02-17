// في ملف types/arabic-reshaper.d.ts
declare module 'arabic-reshaper' {
    export function rewrite(text: string): string;
    export function convert(text: string): string; // أضف convert هنا إذا كنت مصر على استخدامها
    const _default: {
      rewrite: (text: string) => string;
      convert: (text: string) => string;
    };
    export default _default;
  }