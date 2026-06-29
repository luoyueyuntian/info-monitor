declare module "echarts" {
  export type EChartsOption = any;

  export class ECharts {
    setOption(option: EChartsOption, opts?: Record<string, unknown>): void;
    resize(): void;
    dispose(): void;
  }

  export function init(element: HTMLElement): ECharts;
}
