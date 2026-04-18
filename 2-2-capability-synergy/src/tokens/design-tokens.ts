/**
 * Design Tokens — 由 Figma MCP 自动同步生成
 *
 * 来源：Figma → Variables → Token Studio
 * 最后同步：通过 component-generator Skill 触发
 *
 * 不要手动修改本文件，通过 Figma MCP 重新同步。
 */
export const tokens = {
  colors: {
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#dbeafe',
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      muted: '#9ca3af',
      inverse: '#ffffff',
    },
    bg: {
      white: '#ffffff',
      subtle: '#f9fafb',
      muted: '#f3f4f6',
      overlay: 'rgba(0, 0, 0, 0.05)',
    },
    border: {
      default: '#e5e7eb',
      focus: '#2563eb',
    },
    status: {
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  },
} as const;

export type Tokens = typeof tokens;
