/**
 * Turns anything into a string as best it can
 */
export function stringify(value: unknown): string {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      return String(value);
    }
  
    try {
      const seen = new Set<unknown>();
      return JSON.stringify(value, (_, value) => {
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }
  
        return value;
      });
    } catch {
      return String(value);
    }
  }

