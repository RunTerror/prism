// Slider: the platform's own control (iOS: UISlider through PRSNativeSlider), because users expect
// its exact feel (CLIENTS.md section 4). The optional label is drawn above it with our tokens.
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismSliderViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
}

/**
 * @Component
 */
export class PrismSlider extends Component<PrismSliderViewModel> {
  /** The native slider calls this with the new (snapped) number; we send it to the runtime. */
  private onChange = (value: number): void => {
    const change = this.viewModel.node.on?.change;
    if (change) this.viewModel.send(change, value);
  };

  onRender(): void {
    const { node, theme } = this.viewModel;
    const p = node.p ?? {};
    <view flexDirection='column' gap={theme.space.xs} alignSelf='stretch' flexGrow={1}>
      {p.label ? <label value={p.label} {...textStyle(theme, 'sm', 'medium')} color={theme.color.textMuted} /> : undefined}
      <custom-view
        iosClass='PRSNativeSlider'
        androidClass='dev.prism.sdk.widgets.PrismNativeSlider'
        pScheme={this.viewModel.theme.scheme}
        height={34}
        pValue={p.value}
        pMin={p.min}
        pMax={p.max}
        pStep={p.step}
        pTint={toneColors(theme, 'primary').solid}
        pDisabled={!!p.disabled}
        pOnChange={this.onChange}
        accessibilityLabel={p.label}
      />
    </view>;
  }
}
