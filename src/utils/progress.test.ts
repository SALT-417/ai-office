import { calculateOverallProgress, clampProgress } from './progress';

describe('progress utilities', () => {
  it('calculates the rounded average of all five employees', () => {
    expect(calculateOverallProgress({ ren: 45, mio: 40, sou: 30, yuna: 35, aki: 25 })).toBe(35);
    expect(calculateOverallProgress({ ren: 46, mio: 40, sou: 30, yuna: 35, aki: 25 })).toBe(35);
    expect(calculateOverallProgress({ ren: 48, mio: 40, sou: 30, yuna: 35, aki: 25 })).toBe(36);
  });
  it('clamps values to the valid progress range', () => {
    expect(clampProgress(-10)).toBe(0);
    expect(clampProgress(105)).toBe(100);
    expect(clampProgress(42.6)).toBe(43);
  });
});
