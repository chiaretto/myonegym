import { describe, expect, it } from 'vitest'
import { MAX_EDGE, fitDimensions } from './fitDimensions'

describe('fitDimensions', () => {
  it('caps a landscape photo on its width', () => {
    expect(fitDimensions(4000, 3000)).toEqual({ width: 1600, height: 1200 })
  })

  it('caps a portrait photo on its height', () => {
    expect(fitDimensions(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('caps a square photo on both sides', () => {
    expect(fitDimensions(3000, 3000)).toEqual({ width: 1600, height: 1600 })
  })

  it('never upscales a photo that is already small', () => {
    expect(fitDimensions(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('leaves a photo exactly at the bound alone', () => {
    expect(fitDimensions(MAX_EDGE, 900)).toEqual({ width: 1600, height: 900 })
  })

  it('preserves the aspect ratio', () => {
    const { width, height } = fitDimensions(4032, 3024) // a real iPhone 12 MP frame
    expect(width).toBe(1600)
    expect(width / height).toBeCloseTo(4032 / 3024, 2)
  })

  it('keeps an extreme panorama at least 1px on the short edge', () => {
    const { width, height } = fitDimensions(20000, 10)
    expect(width).toBe(1600)
    expect(height).toBeGreaterThanOrEqual(1)
  })

  it('honours a custom bound', () => {
    expect(fitDimensions(1000, 500, 100)).toEqual({ width: 100, height: 50 })
  })

  it('rejects nonsense dimensions', () => {
    expect(() => fitDimensions(0, 100)).toThrow()
    expect(() => fitDimensions(100, 0)).toThrow()
    expect(() => fitDimensions(-5, 100)).toThrow()
    expect(() => fitDimensions(Number.NaN, 100)).toThrow()
  })
})
