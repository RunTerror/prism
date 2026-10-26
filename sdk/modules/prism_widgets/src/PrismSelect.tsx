// Select: a field framed with our tokens that opens the platform's own menu
// (iOS: UIButton + UIMenu through PRSNativeSelect). Choosing sends the option's value.
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismSelectViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
}

/**
 * @Component
 */
export class PrismSelect extends Component<PrismSelectViewModel> {
  /** The native menu reports the chosen index; we send that option's value. */
  private onChange = (index: number): void => {
    const p = this.viewModel.node.p ?? {};
    const option = (p.options ?? [])[index];
    const change = this.viewModel.node.on?.change;
    if (option && change) this.viewModel.send(change, option.value);
  };

  onRender(): void {
    const { node, theme } = this.viewModel;
    const p = node.p ?? {};
    // Options arrive as [{ label, value }] (the runtime makes them uniform).
    const options: { label: string; value: string }[] = p.options ?? [];
    const selected = options.findIndex((o) => o.value === p.value);
    <view flexDirection='column' gap={theme.space.xs} alignSelf='stretch'>
      {p.label ? <label value={p.label} {...textStyle(theme, 'sm', 'medium')} color={theme.color.textMuted} /> : undefined}
      <view borderRadius={theme.component.input.radius} borderWidth={1} borderColor={theme.color.borderStrong}
        backgroundColor={theme.color.surface} opacity={p.disabled ? 0.5 : 1}>
        <custom-view
          iosClass='PRSNativeSelect'
        androidClass='dev.prism.sdk.widgets.PrismNativeSelect'
        pScheme={this.viewModel.theme.scheme}
          height={theme.controlHeight.md}
          pItems={options.map((o) => o.label).join('\n')}
          pSelected={selected}
          pPlaceholder={p.placeholder}
          pColor={theme.color.text}
          pMutedColor={theme.color.textMuted}
          pDisabled={!!p.disabled}
          pOnChange={this.onChange}
        />
      </view>
    </view>;
  }
}
