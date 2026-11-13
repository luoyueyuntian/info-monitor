import { init, use } from "echarts/core";
import { LineChart, BarChart, CandlestickChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkPointComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

use([LineChart, BarChart, CandlestickChart, GridComponent, TooltipComponent,
  LegendComponent, DataZoomComponent, MarkPointComponent, MarkLineComponent, CanvasRenderer]);
export { init };
