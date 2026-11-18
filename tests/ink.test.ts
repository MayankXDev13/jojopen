import { describe, test, expect } from 'bun:test';
import {
  pressureFromEvent,
  simulatePressure,
  streamline,
  chaikin,
  simplify,
  snapAngle15,
  strokeOutlinePath,
  type InkPoint,
} from '../src/lib/ink';

describe('Ink: Pressure & Event Dynamics', () => {
  test('pressureFromEvent recognizes stylus pen pressure vs mouse', () => {
    // Mouse event
    const mouseEvt = { pressure: 0.5, pointerType: 'mouse' } as any;
    expect(pressureFromEvent(mouseEvt, 0.5)).toEqual({ pressure: 0.5, isPen: false });

    // Pen event
    const penEvt = { pressure: 0.72, pointerType: 'pen' } as any;
    expect(pressureFromEvent(penEvt, 0.5)).toEqual({ pressure: 0.72, isPen: true });

    // Pen clamping
    const penLow = { pressure: 0.02, pointerType: 'pen' } as any;
    expect(pressureFromEvent(penLow, 0.5)).toEqual({ pressure: 0.1, isPen: true });

    const penHigh = { pressure: 1.5, pointerType: 'pen' } as any;
    expect(pressureFromEvent(penHigh, 0.5)).toEqual({ pressure: 1.0, isPen: true });
  });

  test('simulatePressure scales inversely with movement speed', () => {
    // Slow movement -> high pressure (thick stroke)
    const slowPressure = simulatePressure(1, 100);
    expect(slowPressure).toBeCloseTo(0.9, 1);

    // Fast movement -> low pressure (thin stroke, clamped to 0.25)
    const fastPressure = simulatePressure(500, 16);
    expect(fastPressure).toBe(0.25);

    // Medium velocity
    const medPressure = simulatePressure(20, 20); // v = 1
    expect(medPressure).toBeLessThan(0.9);
    expect(medPressure).toBeGreaterThan(0.25);
  });
});

describe('Ink: Smoothing and Streamline', () => {
  test('streamline interpolates between previous and next points', () => {
    const prev: InkPoint = { x: 0, y: 0, pressure: 0.2 };
    const next: InkPoint = { x: 100, y: 50, pressure: 0.8 };

    // Default t = 0.45 -> factor (1 - 0.45) = 0.55
    const res = streamline(prev, next, 0.45);
    expect(res.x).toBeCloseTo(55);
    expect(res.y).toBeCloseTo(27.5);
    expect(res.pressure).toBeCloseTo(0.53);

    // t = 0.5 -> exact midpoint
    const mid = streamline(prev, next, 0.5);
    expect(mid.x).toBe(50);
    expect(mid.y).toBe(25);
    expect(mid.pressure).toBe(0.5);
  });

  test('chaikin rounds corners and subdivides segments', () => {
    // Short paths (<3 points) returned unchanged
    const shortPath: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 10, pressure: 0.5 },
    ];
    expect(chaikin(shortPath)).toEqual(shortPath);

    // Triangle path with 3 points
    const triangle: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 50, y: 100, pressure: 0.5 },
      { x: 100, y: 0, pressure: 0.5 },
    ];
    const smoothed = chaikin(triangle);
    // Starts at first, ends at last, generates 2 points per internal segment
    expect(smoothed[0]).toEqual(triangle[0]);
    expect(smoothed[smoothed.length - 1]).toEqual(triangle[2]);
    expect(smoothed.length).toBe(6); // 1 + 2 * (3 - 1) + 1 = 6
  });
});

describe('Ink: Simplification, Snapping, and Outlines', () => {
  test('simplify reduces collinear points using RDP algorithm', () => {
    // Points along a straight line with tiny collinear steps
    const line: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 10, y: 0, pressure: 0.5 },
      { x: 20, y: 0, pressure: 0.5 },
      { x: 30, y: 0, pressure: 0.5 },
      { x: 40, y: 0, pressure: 0.5 },
      { x: 50, y: 0, pressure: 0.5 },
    ];
    const simplified = simplify(line, 1.0);
    expect(simplified.length).toBe(2);
    expect(simplified[0]).toEqual(line[0]);
    expect(simplified[1]).toEqual(line[line.length - 1]);

    // Path with significant spike
    const spike: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 50, y: 100, pressure: 0.5 },
      { x: 100, y: 0, pressure: 0.5 },
    ];
    // Length < 4 returns unmodified
    expect(simplify(spike, 1.0).length).toBe(3);

    const spike4: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 25, y: 50, pressure: 0.5 }, // Collinear on chord to peak
      { x: 50, y: 100, pressure: 0.5 },
      { x: 100, y: 0, pressure: 0.5 },
    ];
    const simplifiedSpike = simplify(spike4, 1.0);
    expect(simplifiedSpike.length).toBe(3); // Drops (25, 50), keeps peak (50, 100)
    expect(simplifiedSpike[1]).toEqual({ x: 50, y: 100, pressure: 0.5 });
  });

  test('snapAngle15 snaps angles to nearest 15-degree increment', () => {
    const origin = { x: 0, y: 0 };

    // 0 deg (horizontal right)
    expect(snapAngle15(origin, { x: 100, y: 0 })).toEqual({ x: 100, y: 0 });

    // 90 deg (vertical down)
    const down = snapAngle15(origin, { x: 0, y: 100 });
    expect(down.x).toBeCloseTo(0);
    expect(down.y).toBeCloseTo(100);

    // 14 deg should snap to 15 deg (PI/12)
    const len = 100;
    const rad14 = (14 * Math.PI) / 180;
    const pt14 = { x: Math.cos(rad14) * len, y: Math.sin(rad14) * len };
    const snapped15 = snapAngle15(origin, pt14);
    const rad15 = (15 * Math.PI) / 180;
    expect(snapped15.x).toBeCloseTo(Math.cos(rad15) * len);
    expect(snapped15.y).toBeCloseTo(Math.sin(rad15) * len);

    // Preserves distance
    const distBefore = Math.hypot(pt14.x, pt14.y);
    const distAfter = Math.hypot(snapped15.x, snapped15.y);
    expect(distAfter).toBeCloseTo(distBefore);
  });

  test('strokeOutlinePath generates valid SVG path commands', () => {
    // Empty
    expect(strokeOutlinePath([], 4)).toBe('');

    // Single point creates circle dot
    const dotPath = strokeOutlinePath([{ x: 50, y: 50, pressure: 0.5 }], 10);
    expect(dotPath).toContain('M');
    expect(dotPath).toContain('a');

    // Multi-point stroke generates closed polygon path
    const stroke: InkPoint[] = [
      { x: 0, y: 0, pressure: 0.5 },
      { x: 50, y: 20, pressure: 0.7 },
      { x: 100, y: 50, pressure: 0.4 },
    ];
    const path = strokeOutlinePath(stroke, 8);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('L');
  });
});
