// Switch: the platform's own control (iOS: UISwitch through PRSNativeSwitch), because users expect
// its exact feel (CLIENTS.md section 4). Label on the left, switch on the right, full width.
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismSwitchViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
}

/**
 * @Component
 */
export class PrismSwitch extends Component<PrismSwitchViewModel> {
  /** The native switch calls this with its new on/off; we send it to the runtime. */
  private onChange = (on: boolean): void => {
    const change = this.viewModel.node.on?.change;
    if (change) this.viewModel.send(change, on);
  };

  onRender(): void {
    const { node, theme } = this.viewModel;
    const p = node.p ?? {};
    <view flexDirection='row' alignItems='center' gap={theme.space.md} alignSelf='stretch'>
      <label value={p.label ?? ''} {...textStyle(theme, 'md')} color={theme.color.text}
        flexGrow={1} flexShrink={1} numberOfLines={0} />
      <custom-view
        iosClass='PRSNativeSwitch'
        androidClass='dev.prism.sdk.widgets.PrismNativeSwitch'
        pScheme={this.viewModel.theme.scheme}
        flexShrink={0}
        pValue={!!p.value}
        pTint={toneColors(theme, 'primary').solid}
        pDisabled={!!p.disabled}
        pOnChange={this.onChange}
        accessibilityLabel={p.label}
      />
    </view>;
  }
}
