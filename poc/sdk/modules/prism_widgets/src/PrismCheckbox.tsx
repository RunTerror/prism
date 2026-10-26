// Checkbox, written once from Valdi's own elements: a box (filled with a check when ticked) and a
// label. Tapping anywhere on the row sends the opposite value (CLIENTS.md section 4).
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismCheckboxViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
}

/**
 * @Component
 */
export class PrismCheckbox extends Component<PrismCheckboxViewModel> {
  private onTap = (): void => {
    const p = this.viewModel.node.p ?? {};
    const change = this.viewModel.node.on?.change;
    if (change && !p.disabled) this.viewModel.send(change, !p.value);
  };

  onRender(): void {
    const { node, theme } = this.viewModel;
    const p = node.p ?? {};
    const primary = toneColors(theme, 'primary');
    const on = !!p.value;
    <view flexDirection='row' alignItems='center' gap={theme.space.sm} opacity={p.disabled ? 0.4 : 1}
      onTap={this.onTap} accessibilityCategory='checkbox' accessibilityNavigation='leaf'
      accessibilityLabel={p.label} accessibilityStateSelected={on}>
      <view width={22} height={22} borderRadius={theme.radius.sm} alignItems='center' justifyContent='center'
        backgroundColor={on ? primary.solid : theme.color.surface}
        borderWidth={on ? 0 : 1.5} borderColor={theme.color.borderStrong}>
        {/* A plain text tick: no icon set needed (icons are an open question, see README). */}
        {on ? <label value='✓' font={textStyle(theme, 'sm', 'bold').font} color={primary.onSolid} /> : undefined}
      </view>
      {p.label
        ? <label value={p.label} {...textStyle(theme, 'md')} color={theme.color.text} flexShrink={1} numberOfLines={0} />
        : undefined}
    </view>;
  }
}
