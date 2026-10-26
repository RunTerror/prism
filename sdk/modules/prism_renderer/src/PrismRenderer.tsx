// prism_renderer: draws a Prism screen tree with Valdi views.
// The part library turns every part the AI writes into the 15 basic blocks (box, text, button,
// pager…; ARCHITECTURE.md section 9), so this draws blocks only. Every prop arrives complete and
// checked by the runtime; every size and colour comes from prism_theme. Any other name is drawn as
// an outlined placeholder showing its name.
import { Component } from 'valdi_core/src/Component';
import { Device } from 'valdi_core/src/Device';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { PrismButton } from 'prism_widgets/src/PrismButton';
import { PrismSlider } from 'prism_widgets/src/PrismSlider';
import { PrismSwitch } from 'prism_widgets/src/PrismSwitch';
import { PrismCheckbox } from 'prism_widgets/src/PrismCheckbox';
import { PrismInput } from 'prism_widgets/src/PrismInput';
import { PrismSelect } from 'prism_widgets/src/PrismSelect';
import { PrismChart } from './PrismChart';
import { PrismImage } from './PrismImage';
import { Theme, textStyle, titleStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismRendererViewModel {
  tree: PrismNode;
  theme: Theme;
  send: PrismSend;
  /** The envelope's approved images (appData.images): name -> https address. */
  images: { [name: string]: string };
}

type FlexAlign = 'flex-start' | 'center' | 'flex-end' | 'stretch';
type FlexJustify = 'flex-start' | 'center' | 'flex-end' | 'space-between';
type TextAlign = 'left' | 'center' | 'right';

// Catalog values -> Valdi layout values.
const ALIGN: { [name: string]: FlexAlign } = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
const JUSTIFY: { [name: string]: FlexJustify } = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between' };
// Valdi labels align left/right, not start/end. Fine for left-to-right languages; revisit for RTL.
const TEXT_ALIGN: { [name: string]: TextAlign } = { start: 'left', center: 'center', end: 'right' };

// Blocks: status -> today's tone; box surface names; button kind -> today's button look.
const STATUS_TONE: { [status: string]: string } = { good: 'success', warning: 'warning', bad: 'danger' };
const SURFACE: { [name: string]: 'none' | 'card' | 'sunk' | 'note' | 'pill' } = { none: 'none', card: 'card', sunk: 'sunk', note: 'note', pill: 'pill' };
const BUTTON_KIND: { [kind: string]: { variant: string; tone: string } } = {
  main: { variant: 'solid', tone: 'primary' },
  quiet: { variant: 'outline', tone: 'primary' },
  danger: { variant: 'outline', tone: 'danger' },
  plain: { variant: 'ghost', tone: 'primary' },
};
/** The circle of a `count` text (tokens.json component.count.size). */
const COUNT_SIZE = 24;
/** Width of a pager page that peeks (the next one shows at the edge on a phone). */
const PAGER_CARD_WIDTH = 280;

/** The plain text children of a text part, joined. */
function textOf(node: PrismNode): string {
  let s = '';
  for (const c of node.c ?? []) if (typeof c === 'string') s += c;
  return s;
}

/** A stable key per child. Ids repeat inside lists, so the identity is id + list key. */
function keyOf(node: PrismNode, index: number): string {
  return node.k !== undefined ? `${node.id}:${node.k}` : `${node.id}:#${index}`;
}

/**
 * @Component
 */
export class PrismRenderer extends Component<PrismRendererViewModel> {
  onRender(): void {
    this.renderNode(this.viewModel.tree, 'root', false);
  }

  /** Draws every child node of `node`. Plain-text children belong to text parts, so they're skipped here. */
  private renderChildren(node: PrismNode, inRow: boolean): void {
    const kids = node.c ?? [];
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (typeof child !== 'string') this.renderNode(child, keyOf(child, i), inRow);
    }
  }

  /**
   * Draws one node. `inRow`: its parent is a Row, so it may shrink sideways to fit.
   * (Only in a Row: in a column, flexShrink squeezes height, and text gets cut to one line.)
   */
  private renderNode(node: PrismNode, key: string, inRow: boolean): void {
    if (!this.renderBlock(node, key, inRow)) this.renderPlaceholder(node, key);
  }

  /**
   * Basic blocks (lowercase names; ARCHITECTURE.md section 9): the part library builds every part
   * from these. They carry roles and status, never colours. Until the theme speaks in roles
   * (DESIGN-SYSTEM.md), they map onto today's tones: accent = primary, good = success,
   * warning = warning, bad = danger. Returns false for a name that isn't a block.
   */
  private renderBlock(node: PrismNode, key: string, inRow: boolean): boolean {
    const theme = this.viewModel.theme;
    const c = theme.color;
    const p = node.p ?? {};
    const send = this.viewModel.send;
    const tone: string | undefined = p.status ? STATUS_TONE[p.status] : undefined;

    switch (node.t) {
      case 'box': {
        const row = p.dir === 'row';
        const tint = tone ? toneColors(theme, tone).soft : c.surfaceMuted;
        const surface = SURFACE[p.surface] ?? 'none';
        const press = node.on?.press;
        // A pill has its own padding (badge tokens: less above and below, more at the sides), whatever `pad` says.
        const badge = theme.component.badge;
        <view key={key} flexDirection={row ? 'row' : 'column'} gap={theme.space[p.gap]}
          padding={surface === 'pill' ? `${badge.padY} ${badge.padX}` : theme.space[p.pad]}
          alignItems={ALIGN[p.align]} justifyContent={JUSTIFY[p.justify]} flexWrap={p.wrap ? 'wrap' : 'no-wrap'}
          flexGrow={p.grow ? 1 : 0} flexBasis={p.grow ? 0 : undefined} flexShrink={inRow ? 1 : 0}
          backgroundColor={surface === 'card' ? c.surface : surface === 'none' ? undefined : surface === 'sunk' ? c.surfaceMuted : tint}
          borderWidth={surface === 'card' ? 1 : 0} borderColor={c.border}
          borderRadius={surface === 'card' ? theme.component.card.radius : surface === 'pill' ? theme.radius.full
            : surface === 'note' ? theme.component.callout.radius : surface === 'sunk' ? theme.radius.md : 0}
          alignSelf={surface === 'pill' && !inRow ? 'flex-start' : undefined}
          onTap={press ? () => send(press) : undefined}
          accessibilityCategory={press ? 'button' : undefined}
          accessibilityLabel={p.label}>
          {this.renderChildren(node, row)}
        </view>;
        return true;
      }

      case 'text': {
        const role: string = p.role;
        if (role === 'count') {
          // A short number or letter in a circle (steps, answers): accent tint, or the status colour.
          const fill = tone ? toneColors(theme, tone).solid : toneColors(theme, 'primary').soft;
          const ink = tone ? toneColors(theme, tone).onSolid : toneColors(theme, 'primary').text;
          <view key={key} width={COUNT_SIZE} height={COUNT_SIZE} borderRadius={COUNT_SIZE / 2} backgroundColor={fill}
            alignItems='center' justifyContent='center' flexShrink={0}>
            <label value={textOf(node)} {...textStyle(theme, 'sm', 'semibold')} color={ink} />
          </view>;
          return true;
        }
        if (role === 'code') {
          // Code keeps its lines as written and scrolls sideways, in a code font: Menlo on iOS.
          // (Android keeps the app's font until a code font is tried there.)
          const code = textStyle(theme, 'sm');
          const font = Device.isIOS() ? code.font.replace(/^\S+/, 'Menlo-Regular') : code.font;
          <scroll key={key} horizontal={true} showsHorizontalScrollIndicator={false}>
            <label value={textOf(node)} font={font} lineHeight={code.lineHeight} color={c.text} numberOfLines={0} />
          </scroll>;
          return true;
        }
        const style = role === 'title' ? titleStyle(theme, 'md')
          : role === 'number' ? titleStyle(theme, 'lg')
          : role === 'secondary' ? textStyle(theme, 'sm', p.strong ? 'semibold' : 'regular')
          : role === 'label' ? textStyle(theme, 'sm', 'semibold')
          : textStyle(theme, 'md', p.strong ? 'semibold' : 'regular');
        const color = tone ? toneColors(theme, tone).text : role === 'secondary' ? c.textMuted : c.text;
        <label key={key} value={textOf(node)} {...style} color={color} textAlign={TEXT_ALIGN[p.align]}
          textDecoration={p.strike ? 'strikethrough' : 'none'} numberOfLines={p.lines ?? 0} flexShrink={inRow ? 1 : 0} />;
        return true;
      }

      case 'button': {
        const look = BUTTON_KIND[p.kind] ?? BUTTON_KIND.quiet;
        const asPart: PrismNode = { ...node, p: { variant: look.variant, tone: look.tone, size: 'md', disabled: p.disabled, label: p.label } };
        <PrismButton key={key} node={asPart} theme={theme} send={send} label={textOf(node)}
          selected={!!p.selected && p.kind !== 'main'} full={!!p.full} />;
        return true;
      }

      case 'progress': {
        const progress = theme.component.progress;
        <view key={key} height={progress.height} borderRadius={progress.radius} backgroundColor={c.surfaceMuted}
          alignSelf='stretch' flexGrow={inRow ? 1 : 0} accessibilityLabel={p.label}>
          <view height='100%' width={`${Math.round(p.value * 100)}%`} borderRadius={progress.radius}
            backgroundColor={toneColors(theme, tone ?? 'primary').solid} />
        </view>;
        return true;
      }

      case 'pager': {
        // Native sideways scrolling. peek: card-width pages, so the next one shows at the edge;
        // otherwise full-width pages that snap one at a time.
        const peek = p.peek !== false;
        <scroll key={key} horizontal={true} pagingEnabled={!peek} showsHorizontalScrollIndicator={false}>
          <view flexDirection='row' gap={peek ? theme.space[p.gap] : 0} alignItems='stretch'>
            {(node.c ?? []).forEach((page, i) => {
              if (typeof page === 'string') return;
              <view key={keyOf(page, i)} width={peek ? PAGER_CARD_WIDTH : '100%'} flexShrink={0}>
                {this.renderNode(page, 'page', false)}
              </view>;
            })}
          </view>
        </scroll>;
        return true;
      }

      case 'collapse':
        if (p.open) {
          <view key={key} flexDirection='column' flexShrink={inRow ? 1 : 0}>
            {this.renderChildren(node, false)}
          </view>;
        }
        return true;

      case 'divider':
        // Across by default; `vertical` goes down and fills the height its box gives it.
        if (p.vertical) <view key={key} width={2} flexGrow={1} minHeight={8} alignSelf='center' borderRadius={1} backgroundColor={c.border} />;
        else <view key={key} height={1} alignSelf='stretch' backgroundColor={c.border} />;
        return true;

      case 'spacer':
        <view key={key} flexGrow={1} flexShrink={1} />;
        return true;

      // Same inputs as the parts of the same name, so the same native drawing.
      case 'checkbox':
        <PrismCheckbox key={key} node={node} theme={theme} send={send} />;
        return true;
      case 'switch':
        <PrismSwitch key={key} node={node} theme={theme} send={send} />;
        return true;
      case 'slider':
        <PrismSlider key={key} node={node} theme={theme} send={send} />;
        return true;
      case 'input':
        <PrismInput key={key} node={node} theme={theme} send={send} inRow={inRow} />;
        return true;
      case 'select':
        <PrismSelect key={key} node={node} theme={theme} send={send} />;
        return true;
      case 'chart':
        <PrismChart key={key} node={node} theme={theme} />;
        return true;
      case 'image':
        <PrismImage key={key} node={node} theme={theme} images={this.viewModel.images} />;
        return true;

      default:
        return false;
    }
  }

  /** A name that isn't a block: an outlined box with its name, so mistakes are visible. */
  private renderPlaceholder(node: PrismNode, key: string): void {
    const theme = this.viewModel.theme;
    const label = textOf(node);
    <view key={key} borderWidth={1} borderColor={theme.color.borderStrong} borderRadius={theme.radius.sm}
      padding='4 8' alignSelf='flex-start'>
      <label value={`<${node.t}>${label ? ' ' + label : ''}`} {...textStyle(theme, 'sm')} color={theme.color.textMuted} />
    </view>;
  }
}
