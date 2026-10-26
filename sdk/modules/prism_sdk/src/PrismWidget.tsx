// PrismWidget: shows one Prism block and keeps it alive. The SDK's public component: exported to
// iOS as PRSPrismWidget and to Android as dev.prism.sdk.PrismWidget (see BUILD.bazel at the root).
//
//   load:  envelope -> sandboxLoad -> screen tree -> draw
//   tap:   "h1" -> sandboxEvent -> new screen tree -> draw again
//
// The AI's code runs in prism_sandbox (its own JS context), never in this one. The runtime there
// holds the block's state (count = 1); this component only keeps the latest tree, and tells the
// host about the content height, effects (toast / open / copy / ask) and snapshots.
//
// Snapshot: everything needed to bring the widget back instantly (state + last tree + height).
// The host stores what onSnapshot gives it and passes it back as snapshotJson when the widget is
// made again (a lazy list scrolled back, the chat reopened days later): the saved tree is drawn on
// the very first frame, at the saved height, while the sandbox loads the saved state behind it.
import { StatefulComponent } from 'valdi_core/src/Component';
import { ElementFrame } from 'valdi_tsx/src/Geometry';
import { PrismNode, PrismOutput } from 'prism_core/src/PrismCore';
import { sandboxEvent, sandboxLoad, sandboxUnload, sandboxUseLibrary } from 'prism_sandbox/src/PrismSandbox';
import { PrismRenderer } from 'prism_renderer/src/PrismRenderer';
import { themeFor, textStyle } from 'prism_theme/src/Theme';

/**
 * @ViewModel
 * @ExportModel({ios: 'PRSPrismWidgetViewModel', android: 'dev.prism.sdk.PrismWidgetViewModel'})
 */
export interface PrismWidgetViewModel {
  /** The compiled envelope (JSON string) from the Prism server. */
  envelopeJson: string;
  /** Unique per block on screen, e.g. "msg_123/block_0". */
  instanceId: string;
  /** A snapshot saved earlier from onSnapshot. Only read when the block loads. */
  snapshotJson?: string;
  /** "light" | "dark". Hosts pass the system setting. Default light. */
  colorScheme?: string;
  /**
   * A newer part library from the app's server (the code of core/dist/prism-library.js). Every
   * SDK carries a copy; this one is used instead if its version is newer. Parts and design fixes
   * then ship without an app update (ARCHITECTURE.md section 9).
   */
  libraryJs?: string;
  /** The app's brand as JSON: { accent, accentDark?, background?, text? } (prism_theme Brand). */
  themeJson?: string;
}

/**
 * @Context
 * @ExportModel({ios: 'PRSPrismWidgetContext', android: 'dev.prism.sdk.PrismWidgetContext'})
 */
export interface PrismWidgetContext {
  /** Called whenever the content height changes (points on iOS, dp on Android). */
  onContentHeight?: (height: number) => void;
  /** toast / open / copy / ask. The widget does nothing itself; the host decides. */
  onEffect?: (type: string, value: string) => void;
  /** A new snapshot (JSON): after the first draw, after every event, and when the height changes. */
  onSnapshot?: (snapshotJson: string) => void;
}

/** What a snapshot holds. `key` ties it to one envelope, so a snapshot never lands on another block. */
interface Snapshot {
  v: 1;
  key: string;
  state: { [name: string]: any };
  tree: PrismNode | null;
  height: number;
}

/** A short fingerprint of the envelope text (djb2), so a snapshot only applies to the same block. */
function envelopeKey(json: string): string {
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  return `${json.length}:${(h >>> 0).toString(36)}`;
}

function readSnapshot(json: string | undefined, key: string): Snapshot | undefined {
  if (!json) return undefined;
  try {
    const s = JSON.parse(json);
    return s && s.v === 1 && s.key === key ? (s as Snapshot) : undefined;
  } catch (e) {
    return undefined;
  }
}

interface State {
  tree: PrismNode | null;
  /** Shown when there is no tree: the envelope's plain-text backup. */
  fallback: string;
}

/**
 * @Component
 * @ExportModel({ios: 'PRSPrismWidget', android: 'dev.prism.sdk.PrismWidget'})
 */
export class PrismWidget extends StatefulComponent<PrismWidgetViewModel, State, PrismWidgetContext> {
  state: State = { tree: null, fallback: '' };
  /** Which load the current answers belong to: answers from an older load are ignored. */
  private loadNumber = 0;
  private loadedId: string | undefined;
  private lastHeight = -1;
  private key = '';
  private lastState: { [name: string]: any } = {};
  /** The envelope's approved images (appData.images). Only https addresses are kept. */
  private images: { [name: string]: string } = {};

  onCreate(): void {
    this.load();
  }

  /** The host changed the block (or which instance it is): load again. A colour change just redraws. */
  onViewModelUpdate(previous?: PrismWidgetViewModel): void {
    if (!previous || previous.envelopeJson !== this.viewModel.envelopeJson || previous.instanceId !== this.viewModel.instanceId) {
      this.load();
    }
  }

  onDestroy(): void {
    this.loadNumber++; // late answers are ignored
    if (this.loadedId !== undefined) sandboxUnload(this.loadedId);
  }

  private load(): void {
    // A newer version of the same screen (streaming: the AI is still writing it) keeps showing the
    // old drawing until the new one is ready, so the screen grows without flashing.
    const keep = this.loadedId !== undefined && this.loadedId === this.viewModel.instanceId ? this.state.tree : null;
    if (this.loadedId !== undefined) sandboxUnload(this.loadedId);
    this.loadedId = undefined;
    const load = ++this.loadNumber;
    let envelope: any = null;
    try {
      envelope = JSON.parse(this.viewModel.envelopeJson);
    } catch (e) {
      envelope = null;
    }
    const fallback = String((envelope && envelope.fallback) || 'This content cannot be shown.').replace(/\*\*/g, '');
    if (!envelope || envelope.ok === false || envelope.v !== 1) {
      // A refused, broken or unknown-version block: don't run it, show the backup text.
      this.setState({ tree: null, fallback });
      return;
    }
    this.key = envelopeKey(this.viewModel.envelopeJson);
    this.images = {};
    const given = (envelope.appData && envelope.appData.images) || {};
    for (const name of Object.keys(given)) {
      if (typeof given[name] === 'string' && /^https:\/\//i.test(given[name])) this.images[name] = given[name];
    }
    const snap = readSnapshot(this.viewModel.snapshotJson, this.key);
    // With a snapshot, its screen is drawn right away; without, nothing until the sandbox answers.
    this.setState({ tree: snap ? snap.tree : keep, fallback: '' });
    if (snap) {
      this.lastState = snap.state;
      this.lastHeight = snap.height;
    }
    const id = this.viewModel.instanceId;
    this.loadedId = id;
    const savedState = snap ? JSON.stringify(snap.state) : undefined;
    sandboxUseLibrary(this.viewModel.libraryJs);
    void sandboxLoad(id, this.viewModel.envelopeJson, savedState).then((out) => {
      if (load === this.loadNumber) this.apply(out, fallback);
    });
  }

  /** Called by a control: send the event to the sandbox, then draw the new tree. */
  private send = (handlerId: string, value?: unknown): void => {
    const id = this.loadedId;
    if (id === undefined) return;
    const load = this.loadNumber;
    void sandboxEvent(id, handlerId, value).then((out) => {
      if (load === this.loadNumber) this.apply(out, this.state.fallback);
    });
  };

  private apply(out: PrismOutput, fallback: string): void {
    for (const err of out.errors) console.log(`[prism] ${err.node}: ${err.message}`);
    // No tree (the runtime refused it, or every part failed): show the backup text instead.
    this.setState({ tree: out.tree, fallback: out.tree ? fallback : fallback || 'This content cannot be shown.' });
    const ctx = this.context;
    if (ctx && ctx.onEffect) {
      for (const fx of out.effects) ctx.onEffect(String(fx.type), String(fx.value));
    }
    this.lastState = out.state;
    this.sendSnapshot();
  }

  /** Tells the host the latest snapshot (only for a block that drew something). */
  private sendSnapshot(): void {
    const ctx = this.context;
    if (!ctx || !ctx.onSnapshot || !this.state.tree || this.lastHeight < 0) return;
    const snap: Snapshot = { v: 1, key: this.key, state: this.lastState, tree: this.state.tree, height: this.lastHeight };
    ctx.onSnapshot(JSON.stringify(snap));
  }

  /** The inner view hugs the content, so its height is the real content height. */
  private onContentLayout = (frame: ElementFrame): void => {
    if (frame.height !== this.lastHeight) {
      this.lastHeight = frame.height;
      const ctx = this.context;
      if (ctx && ctx.onContentHeight) ctx.onContentHeight(frame.height);
      this.sendSnapshot();
    }
  };

  onRender(): void {
    const theme = themeFor(this.viewModel.colorScheme, this.viewModel.themeJson);
    // Outer view fills what the host gives; the inner one hugs the content (for onContentLayout).
    <view flexDirection='column' justifyContent='flex-start' alignItems='stretch'>
      <view flexDirection='column' alignItems='stretch' onLayout={this.onContentLayout}>
        {this.state.tree
          ? <PrismRenderer tree={this.state.tree} theme={theme} send={this.send} images={this.images} />
          : this.state.fallback
            ? <label value={this.state.fallback} {...textStyle(theme, 'md')} color={theme.color.textMuted} numberOfLines={0} />
            : undefined}
      </view>
    </view>;
  }
}
