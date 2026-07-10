/**
 * Template: domain helper.
 * Copy to lib/helpers/<FeatureHelper>.ts when logic is shared by multiple pages or runners.
 */
export class FeatureHelper {
  normalizeValue(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }
}
