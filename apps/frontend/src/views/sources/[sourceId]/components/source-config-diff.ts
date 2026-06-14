export type ConfigDiffEntry = {
  key: string;
  type: "added" | "removed" | "changed" | "unchanged";
  oldValue?: unknown;
  newValue?: unknown;
};

export function computeConfigDiff(
  oldConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
): ConfigDiffEntry[] {
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
  const entries: ConfigDiffEntry[] = [];

  for (const key of Array.from(allKeys).sort()) {
    const inOld = key in oldConfig;
    const inNew = key in newConfig;

    if (!inOld && inNew) {
      entries.push({ key, type: "added", newValue: newConfig[key] });
    } else if (inOld && !inNew) {
      entries.push({ key, type: "removed", oldValue: oldConfig[key] });
    } else {
      const oldVal = JSON.stringify(oldConfig[key]);
      const newVal = JSON.stringify(newConfig[key]);
      if (oldVal !== newVal) {
        entries.push({ key, type: "changed", oldValue: oldConfig[key], newValue: newConfig[key] });
      } else {
        entries.push({ key, type: "unchanged", oldValue: oldConfig[key], newValue: newConfig[key] });
      }
    }
  }

  return entries;
}

export function diffSummary(entries: ConfigDiffEntry[]): string {
  const added = entries.filter((e) => e.type === "added").length;
  const removed = entries.filter((e) => e.type === "removed").length;
  const changed = entries.filter((e) => e.type === "changed").length;

  if (added === 0 && removed === 0 && changed === 0) {
    return "无变化";
  }

  const parts: string[] = [];
  if (added > 0) parts.push(`${added} 个新增`);
  if (removed > 0) parts.push(`${removed} 个删除`);
  if (changed > 0) parts.push(`${changed} 个修改`);

  return parts.join("，");
}
