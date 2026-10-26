// Chart, written once from Valdi's own elements, same on iOS and Android (no Swift Charts, no
// Android chart library: one drawer to keep right). Every series arrives with its tone already
// picked by the runtime; sizes come from theme.component.chart.
//
//   bar         one box per value, round top, from the zero line up (or down for a negative value)
//   line, area  one <shape> per series, its path stretched to the plot box; area adds a faint fill
//
// Values below zero are drawn from the zero line down. A missing value (null) is a gap.
import { Component } from 'valdi_core/src/Component';
import { GeometricPathBuilder, GeometricPathScaleType } from 'valdi_core/src/utils/GeometricPathBuilder';
import { PrismNode } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismChartViewModel {
  node: PrismNode;
  theme: Theme;
}

interface Series {
  name: string;
  values: (number | null)[];
  tone: string;
}

/** Height of the row above the plot that shows the largest value. */
const TOP_LABEL = 18;
/** Coordinate space of a line path: x from 0 to points - 1, y from 0 (top) to 100 (bottom). */
const PATH_HEIGHT = 100;

/** Series colour: the tone's solid colour, but neutral uses the muted text grey (softer next to others). */
function seriesColor(theme: Theme, tone: string): string {
  return tone === 'neutral' ? theme.color.textMuted : toneColors(theme, tone).solid;
}

/** 4200 -> "4,200". Valdi's JS engines don't all format numbers the same, so this is done by hand. */
function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const [whole, part] = String(Math.abs(rounded)).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (rounded < 0 ? '-' : '') + grouped + (part ? '.' + part : '');
}

/**
 * @Component
 */
export class PrismChart extends Component<PrismChartViewModel> {
  onRender(): void {
    const { node, theme } = this.viewModel;
    const p = node.p ?? {};
    const chart = theme.component.chart;
    const series: Series[] = p.data ?? [];
    const labels: string[] = p.labels ?? [];
    const count = Math.max(0, ...series.map((s) => s.values.length));
    const all: number[] = [];
    for (const s of series) for (const v of s.values) if (v !== null) all.push(v);
    const hi = Math.max(0, ...all);
    const lo = Math.min(0, ...all);
    const range = hi - lo || 1;
    const pct = (v: number): number => ((v - lo) / range) * 100; // 0 at the bottom, 100 at the top
    const zero = pct(0);
    const plotHeight = chart.height[p.height as 'sm' | 'md' | 'lg'] ?? chart.height.md;

    // Screen readers get the label and every value: "Steps. Mon 4,200; Tue 8,100; ..."
    const spoken = (p.label ? p.label + '. ' : '') +
      Array.from({ length: count }, (_, i) =>
        `${labels[i] || i + 1} ${series.map((s) => (s.values[i] === null ? 'no value' : formatNumber(s.values[i] as number))).join(', ')}`).join('; ');

    <view flexDirection='column' gap={chart.gap} alignSelf='stretch' accessibilityLabel={spoken}>
      {series.length > 1 ? this.renderLegend(series) : undefined}
      <view height={plotHeight + TOP_LABEL} alignSelf='stretch'>
        <label value={formatNumber(hi)} {...textStyle(theme, 'sm')} color={theme.color.textMuted}
          position='absolute' top={0} left={0} />
        <view position='absolute' left={0} right={0} top={TOP_LABEL} bottom={0}>
          <view position='absolute' left={0} right={0} height={1} bottom={`${zero}%`} backgroundColor={theme.color.border} />
          {p.kind === 'bar'
            ? this.renderBars(series, count, pct, zero)
            : this.renderLines(series, count, pct, zero, p.kind === 'area')}
        </view>
      </view>
      {labels.length > 0 ? this.renderLabels(labels, count, p.kind === 'bar') : undefined}
    </view>;
  }

  private renderBars(series: Series[], count: number, pct: (v: number) => number, zero: number): void {
    const theme = this.viewModel.theme;
    const radius = theme.component.chart.radius;
    <view position='absolute' left={0} right={0} top={0} bottom={0} flexDirection='row' gap={theme.component.chart.gap}>
      {Array.from({ length: count }).forEach((_, i) => {
        <view key={`g${i}`} flexGrow={1} flexBasis={0} flexDirection='row' gap={2}>
          {series.forEach((s, j) => {
            const v = s.values[i];
            <view key={`s${j}`} flexGrow={1} flexBasis={0}>
              {v === null || v === undefined
                ? undefined
                : <view position='absolute' left={0} right={0}
                    bottom={`${v >= 0 ? zero : pct(v)}%`} height={`${Math.abs(pct(v) - zero)}%`}
                    borderRadius={v >= 0 ? `${radius} ${radius} 0 0` : `0 0 ${radius} ${radius}`}
                    backgroundColor={seriesColor(theme, s.tone)} />}
            </view>;
          })}
        </view>;
      })}
    </view>;
  }

  private renderLines(series: Series[], count: number, pct: (v: number) => number, zero: number, area: boolean): void {
    const theme = this.viewModel.theme;
    const width = Math.max(count - 1, 1);
    const x = (i: number): number => (count === 1 ? 0.5 : i);
    const y = (v: number): number => PATH_HEIGHT - pct(v);
    series.forEach((s, j) => {
      // A gap (null) breaks the line into pieces.
      const pieces: [number, number][][] = [[]];
      s.values.forEach((v, i) => {
        if (v === null) pieces.push([]);
        else pieces[pieces.length - 1].push([x(i), y(v)]);
      });
      const color = seriesColor(theme, s.tone);
      pieces.filter((pc) => pc.length > 0).forEach((pc, k) => {
        if (area) {
          const fill = new GeometricPathBuilder(width, PATH_HEIGHT, GeometricPathScaleType.Fill)
            .moveTo(pc[0][0], PATH_HEIGHT - zero);
          for (const [px, py] of pc) fill.lineTo(px, py);
          fill.lineTo(pc[pc.length - 1][0], PATH_HEIGHT - zero).close();
          <shape key={`a${j}-${k}`} position='absolute' left={0} right={0} top={0} bottom={0}
            path={fill.build()} fillColor={color} opacity={0.18} />;
        }
        const line = new GeometricPathBuilder(width, PATH_HEIGHT, GeometricPathScaleType.Fill).moveTo(pc[0][0], pc[0][1]);
        for (let i = 1; i < pc.length; i++) line.lineTo(pc[i][0], pc[i][1]);
        // A single point still shows: a tiny line drawn with round ends is a dot.
        if (pc.length === 1) line.lineTo(pc[0][0] + 0.001, pc[0][1]);
        <shape key={`l${j}-${k}`} position='absolute' left={0} right={0} top={0} bottom={0}
          path={line.build()} strokeColor={color} strokeWidth={theme.component.chart.lineWidth}
          strokeCap='round' strokeJoin='round' />;
      });
    });
  }

  private renderLegend(series: Series[]): void {
    const theme = this.viewModel.theme;
    <view flexDirection='row' flexWrap='wrap' gap={theme.space.md}>
      {series.forEach((s, j) => {
        <view key={`k${j}`} flexDirection='row' alignItems='center' gap={6}>
          <view width={8} height={8} borderRadius={4} backgroundColor={seriesColor(theme, s.tone)} />
          <label value={s.name || `Series ${j + 1}`} {...textStyle(theme, 'sm')} color={theme.color.textMuted} />
        </view>;
      })}
    </view>;
  }

  /** Bars: one label centred under each group. Lines: labels spread from the first point to the last. */
  private renderLabels(labels: string[], count: number, bars: boolean): void {
    const theme = this.viewModel.theme;
    <view flexDirection='row' gap={theme.component.chart.gap} justifyContent={bars ? 'flex-start' : 'space-between'}>
      {Array.from({ length: count }).forEach((_, i) => {
        <label key={`t${i}`} value={labels[i] ?? ''} {...textStyle(theme, 'sm')} color={theme.color.textMuted}
          textAlign='center' numberOfLines={1} flexGrow={bars ? 1 : 0} flexBasis={bars ? 0 : undefined} flexShrink={1} />;
      })}
    </view>;
  }
}
