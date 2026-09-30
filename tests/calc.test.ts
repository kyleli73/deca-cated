import { describe, expect, it } from 'vitest';
import { evaluate, formatNumber, press, preview, toDisplay } from '../src/lib/calc.ts';

describe('calculator maths', () => {
  it('follows the order of operations and brackets', () => {
    expect(evaluate('2+3*4')).toBe(14);
    expect(evaluate('(2+3)*4')).toBe(20);
    expect(evaluate('(12000-2000)/5')).toBe(2000);
    expect(evaluate('10-4-3')).toBe(3);
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('-3^2')).toBe(-9);
    expect(evaluate('2^-1')).toBe(0.5);
    expect(evaluate('5*-2')).toBe(-10);
  });

  it('handles the finance maths on DECA exams', () => {
    expect(evaluate('1000*(1+0.05)^3')).toBe(1157.625); // compound interest
    expect(evaluate('2000*0.05*3')).toBe(300); // simple interest
    expect(evaluate('150000/60000')).toBe(2.5); // current ratio
    expect(evaluate('20000/(50-30)')).toBe(1000); // break-even units
  });

  it('works with display symbols, commas and implied multiplication', () => {
    expect(evaluate('12,000 − 2,000 ÷ 5')).toBe(11600);
    expect(evaluate('2(3+4)')).toBe(14);
    expect(evaluate('(1+1)(2+2)')).toBe(8);
    expect(evaluate('√16+2')).toBe(6);
    expect(evaluate('3√16')).toBe(12);
  });

  it('does percent like a phone calculator', () => {
    expect(evaluate('200+10%')).toBe(220);
    expect(evaluate('200-10%')).toBe(180);
    expect(evaluate('200*10%')).toBe(20);
    expect(evaluate('15%')).toBe(0.15);
  });

  it('uses the previous answer and hides floating-point noise', () => {
    expect(evaluate('Ans*2', 21)).toBe(42);
    expect(evaluate('0.1+0.2')).toBe(0.3);
  });

  it('closes missing brackets and explains mistakes', () => {
    expect(evaluate('(2+3')).toBe(5);
    expect(() => evaluate('5/0')).toThrow("Can't divide by 0.");
    expect(() => evaluate('5+')).toThrow('Finish the expression.');
    expect(() => evaluate('2+3)')).toThrow('Check the brackets.');
    expect(() => evaluate('1.2.3')).toThrow('Check the decimal point.');
    expect(() => evaluate('√-4')).toThrow('square root of a negative');
    expect(() => evaluate('alert(1)')).toThrow('Can\'t use "a".');
    expect(preview('5+')).toBeNull();
    expect(preview('5+5')).toBe(10);
  });

  it('formats results', () => {
    expect(formatNumber(1157.625)).toBe('1,157.625');
    expect(formatNumber(2000)).toBe('2,000');
    expect(formatNumber(1 / 3)).toBe('0.3333333333');
    expect(formatNumber(1e20)).toBe('1e+20');
    expect(toDisplay('(12000-2000)/5*2')).toBe('(12000−2000)÷5×2');
  });
});

describe('calculator keys', () => {
  it('replaces a doubled operator but allows a negative number', () => {
    expect(press('5+', '*')).toBe('5*');
    expect(press('5*', '-')).toBe('5*-');
    expect(press('5*-', '+')).toBe('5+');
    expect(press('', '*')).toBe('Ans*');
    expect(press('', '-')).toBe('-');
  });

  it("doesn't double decimal points", () => {
    expect(press('3.1', '.')).toBe('3.1');
    expect(press('3.1+', '.')).toBe('3.1+0.');
    expect(press('', '.')).toBe('0.');
  });
});
