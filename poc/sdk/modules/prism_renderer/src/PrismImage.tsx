// Image: a picture the server approved for this block. The tree only names it ("headphones");
// the address comes from the envelope's appData.images, never from the AI's code. A name not in
// that list draws the grey box with the alt text, like a picture that failed to load.
// Loading uses the platform's own loader through Valdi's <image>.
import { StatefulComponent } from 'valdi_core/src/Component';
import { PrismNode } from 'prism_core/src/PrismCore';
import { Theme, textStyle } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismImageViewModel {
  node: PrismNode;
  theme: Theme;
  /** The approved images of the envelope being drawn: name -> https address. */
  images: { [name: string]: string };
}

interface State {
  loaded: boolean;
  failed: boolean;
}

/**
 * @Component
 */
export class PrismImage extends StatefulComponent<PrismImageViewModel, State> {
  state: State = { loaded: false, failed: false };

  private onAssetLoad = (success: boolean): void => {
    this.setState({ loaded: success, failed: !success });
  };

  onRender(): void {
    const { node, theme, images } = this.viewModel;
    const p = node.p ?? {};
    const image = theme.component.image;
    const url = typeof p.src === 'string' && /^https:\/\//i.test(images[p.src] ?? '') ? images[p.src] : undefined;
    const showAlt = !url || this.state.failed;
    <view alignSelf='stretch' aspectRatio={image.ratio[p.ratio as 'square' | 'wide' | 'tall'] ?? image.ratio.wide}
      borderRadius={image.radius} backgroundColor={theme.color.surfaceMuted}
      alignItems='center' justifyContent='center' accessibilityLabel={p.alt}>
      {url && !this.state.failed
        ? <image src={url} objectFit={p.fit === 'contain' ? 'contain' : 'cover'} onAssetLoad={this.onAssetLoad}
            borderRadius={image.radius}
            position='absolute' left={0} right={0} top={0} bottom={0} />
        : undefined}
      {showAlt
        ? <label value={p.alt ?? ''} {...textStyle(theme, 'sm')} color={theme.color.textMuted}
            textAlign='center' numberOfLines={0} margin={theme.space.md} />
        : undefined}
    </view>;
  }
}
