import { describe, it, expect } from 'vitest';

import { calculateTotal } from './price';

describe('calculateTotal', () => {
  // 正常情况
  it('计算单个商品总价', () => {
    const items = [{ price: 100, quantity: 2 }];
    expect(calculateTotal(items)).toBe(200);
  });

  it('计算多个商品总价', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(350);
  });

  it('应用折扣率', () => {
    const items = [{ price: 100, quantity: 2 }];
    const discountRate = 0.1;
    const expected = 180;
    expect(calculateTotal(items, discountRate)).toBe(expected);
  });

  // 边界情况
  it('空数组返回 0', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('折扣率为 0 不打折', () => {
    const items = [{ price: 100, quantity: 1 }];
    expect(calculateTotal(items, 0)).toBe(100);
  });

  it('折扣率为 1 返回 0', () => {
    const items = [{ price: 100, quantity: 1 }];
    expect(calculateTotal(items, 1)).toBe(0);
  });

  // 异常情况
  it('null 输入返回 0', () => {
    expect(calculateTotal(null)).toBe(0);
  });

  it('undefined 输入返回 0', () => {
    expect(calculateTotal(undefined)).toBe(0);
  });
});
