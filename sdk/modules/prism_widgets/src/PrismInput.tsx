// Input: Valdi's built-in <textfield> (<textview> when multiline). It is already the platform's own
// text field on iOS and Android, from one piece of code. We only draw the frame and label with tokens.
//   kind="number" sends a number (or null when empty); "email" picks the email keyboard.
import { Component } from 'valdi_core/src/Component';
import { PrismNode, PrismSend } from 'prism_core/src/PrismCore';
import { Theme, textStyle, toneColors } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 */
export interface PrismInputViewModel {
  node: PrismNode;
  theme: Theme;
  send: PrismSend;
  /** Inside a Row: grow to fill the free width. */
  inRow: boolean;
}

/** What the runtime gets for a typed text: a number (or null) for kind="number", else the text. */
function valueOf(kind: string, text: string): unknown {
  if (kind !== 'number') return text;
  const n = Number(text);
  return text.trim() === '' || isNaN(n) ? null : n;
}

/**
 * @Component
 */
export class PrismInput extends Component<PrismInputViewModel> {
  private onChange = (e: { text: string }): void => {
    const change = this.viewModel.node.on?.change;
    if (change) this.viewModel.send(change, valueOf(this.viewModel.node.p?.kind, e.text));
  };

  private onReturn = (e: { text: string }): void => {
    const submit = this.viewModel.node.on?.submit;
    if (submit) this.viewModel.send(submit, valueOf(this.viewModel.node.p?.kind, e.text));
  };

  onRender(): void {
    const { node, theme, inRow } = this.viewModel;
    const p = node.p ?? {};
    const style = textStyle(theme, 'md');
    const field = {
      value: p.value as string,
      placeholder: p.placeholder,
      font: style.font,
      color: theme.color.text,
      placeholderColor: theme.color.textMuted,
      tintColor: toneColors(theme, 'primary').solid,
      enabled: !p.disabled,
      contentType: p.kind === 'number' ? 'numberDecimal' : p.kind === 'email' ? 'email' : 'default',
      onChange: this.onChange,
      flexGrow: 1,
    } as const;
    <view flexDirection='column' gap={theme.space.xs} flexGrow={inRow ? 1 : 0} flexShrink={inRow ? 1 : 0} alignSelf='stretch'>
      {p.label ? <label value={p.label} {...textStyle(theme, 'sm', 'medium')} color={theme.color.textMuted} /> : undefined}
      <view flexDirection='row' alignItems='center' padding='0 12' borderRadius={theme.component.input.radius}
        borderWidth={1} borderColor={theme.color.borderStrong} backgroundColor={theme.color.surface}
        height={p.multiline ? 88 : theme.controlHeight.md} opacity={p.disabled ? 0.5 : 1}>
        {p.multiline
          ? <textview {...field} height='100%' />
          : <textfield {...field} returnKeyText='done' onReturn={this.onReturn} />}
      </view>
    </view>;
  }
}
