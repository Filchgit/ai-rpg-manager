/**
 * Unit conversion utilities for spatial system
 * Default system uses metric (meters), but can convert to imperial for display
 */

export class UnitConverter {
  /**
   * Convert meters to feet
   */
  static metersToFeet(meters: number): number {
    return meters * 3.28084
  }

  /**
   * Convert feet to meters
   */
  static feetToMeters(feet: number): number {
    return feet / 3.28084
  }

  /**
   * Format distance in the specified unit system
   */
  static formatDistance(
    meters: number,
    unitType: 'meters' | 'feet' = 'meters',
    precision: number = 1
  ): string {
    if (unitType === 'feet') {
      const feet = this.metersToFeet(meters)
      return `${feet.toFixed(precision)} ft`
    }
    return `${meters.toFixed(precision)} m`
  }

  /**
   * Format position coordinates
   */
  static formatPosition(
    x: number,
    y: number,
    z: number,
    unitType: 'meters' | 'feet' = 'meters',
    precision: number = 1
  ): string {
    if (unitType === 'feet') {
      return `(${this.metersToFeet(x).toFixed(precision)}, ${this.metersToFeet(y).toFixed(precision)}, ${this.metersToFeet(z).toFixed(precision)}) ft`
    }
    return `(${x.toFixed(precision)}, ${y.toFixed(precision)}, ${z.toFixed(precision)}) m`
  }

  /**
   * Convert location bounds between systems
   */
  static convertLocationBounds(
    bounds: {
      minX: number
      maxX: number
      minY: number
      maxY: number
      minZ: number
      maxZ: number
    },
    toUnit: 'meters' | 'feet'
  ) {
    const convert = toUnit === 'feet' ? this.metersToFeet : (n: number) => n

    return {
      minX: convert(bounds.minX),
      maxX: convert(bounds.maxX),
      minY: convert(bounds.minY),
      maxY: convert(bounds.maxY),
      minZ: convert(bounds.minZ),
      maxZ: convert(bounds.maxZ),
    }
  }

  /**
   * Get D&D 5e grid squares from meters
   * (1 square = 5 feet = 1.524 meters)
   */
  static metersToGridSquares(meters: number): number {
    return meters / 1.524
  }

  /**
   * Convert grid squares to meters
   */
  static gridSquaresToMeters(squares: number): number {
    return squares * 1.524
  }
}

