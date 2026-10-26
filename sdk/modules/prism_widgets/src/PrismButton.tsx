// Button, written once from Valdi's own elements (a <view> + a <label> + a tap), so it is the
// same native views on iOS and Android and matches our design system (CLIENTS.md section 4).
//   solid:   tone `solid` background, `onSolid` text      (the main action)
//   outline: `surfaceMuted` background, tone `text` text  (other actions; a quiet grey like iOS gray buttons)
//   ghost:   no background or border, tone `text` text     (the least important)
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismButtonViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
  /** The button's text (its text children). */
  label: string;
  /** Shown as chosen (choices, tabs): a soft tint with an accent edge. Used by the button block. */
  selected?: boolean;
  /** As wide as its container. Used by the button block. */
  full?: boolean;
}

/**
 * @Component
 */
export class PrismButton extends Component<PrismButtonViewModel> {
  /** A tap sends the handler id from node.on.press, e.g. "h1", back to the runtime. */
  private onTap = (): void => {
    const p = this.viewModel.node.p ?? {};
    const press = this.viewModel.node.on?.press;
    if (press && !p.disabled) this.viewModel.send(press);
  };

  onRender(): void {
    const { node, theme, label, selected, full } = this.viewModel;
    const p = node.p ?? {};
    const tone = toneColors(theme, p.tone);
    const size: string = p.size;
    const solid = p.variant === 'solid';
    const outline = p.variant === 'outline';
    const text = p.label || label; // `label` prop: what screen readers say (for icon-only buttons)

    <view
      height={theme.controlHeight[size]}
      padding={`0 ${theme.component.button.padX[size as 'sm' | 'md' | 'lg']}`}
      borderRadius={theme.component.button.radius}
      backgroundColor={solid ? tone.solid : selected ? tone.soft : outline ? theme.color.surfaceMuted : 'transparent'}
      borderWidth={selected && !solid ? 1 : 0}
      borderColor={tone.solid}
      alignSelf={full ? 'stretch' : undefined}
      flexDirection='row'
      alignItems='center'
      justifyContent='center'
      flexShrink={0}
      opacity={p.disabled ? 0.4 : 1}
      onTap={this.onTap}
      accessibilityCategory='button'
      accessibilityNavigation='leaf'  // one control for VoiceOver (and UI tests), not a box with text inside
      accessibilityLabel={text}
      accessibilityStateDisabled={!!p.disabled}
    >
      <label value={label} {...textStyle(theme, size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md', 'semibold')}
        color={solid ? tone.onSolid : tone.text} />
    </view>;
  }
}
