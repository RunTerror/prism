// EXAMPLE ONLY: the platform's own button (iOS: UIButton through PRSNativeButton), to compare with
// our written-once PrismButton in the demo. The renderer does not use it (CLIENTS.md section 4).
import { Component } from 'valdi_core/src/Component';

/**
 * @ViewModel
 */
export interface PrismNativeButtonViewModel {
  label: string;
  /** "solid" | "outline" | "ghost", or on iOS 26+ "glass" | "glassProminent" (Liquid Glass) */
  variant: string;
  tint: string;
  onPress: () => void;
}

/**
 * @Component
 */
export class PrismNativeButton extends Component<PrismNativeButtonViewModel> {
  onRender(): void {
    const vm = this.viewModel;
    <custom-view iosClass='PRSNativeButton'
        androidClass='dev.prism.sdk.widgets.PrismNativeButton' flexShrink={0}
      pLabel={vm.label} pVariant={vm.variant} pTint={vm.tint} pOnPress={vm.onPress} />;
  }
}
