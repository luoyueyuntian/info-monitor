export function sameQuery(
  left: Record<string, string | string[] | undefined>,
  right: Record<string, string | string[] | undefined>,
) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) {
      return false;
    }

    const leftValue = left[key];
    const rightValue = right[key];

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return JSON.stringify(leftValue) === JSON.stringify(rightValue);
    }

    return leftValue === rightValue;
  });
}
