import UIKit
import PrismSDK

/// UIKit view that draws one Prism widget natively.
///
/// - Fills the width it is given and reports its content height through
///   `intrinsicContentSize` (width = `noIntrinsicMetric`), so it works in Auto Layout,
///   `UIStackView` and self-sizing cells without a height constraint.
/// - Transparent background, no padding.
/// - All callbacks arrive on the main thread.
///
/// Property changes are applied together on the next main-loop turn (or before the next
/// layout pass), so several properties can be set in a row:
/// - changing `envelopeJSON` or `instanceId` reloads the widget (using `snapshot`);
/// - changing `colorScheme` (or the trait collection, when `colorScheme` is nil) redraws it;
/// - changing only `snapshot` does nothing until the next reload (it is read at load).
///
/// In lazy lists (`UITableView`, `UICollectionView`), keep the last `onSnapshot` per block and pass it
/// back when the cell is made again: the widget then appears instantly, as the user left it.
public final class PrismWidgetView: UIView {

    // MARK: Public properties

    public var envelopeJSON: String {
        didSet { if envelopeJSON != oldValue { setNeedsApply(reload: true) } }
    }

    public var instanceId: String {
        didSet { if instanceId != oldValue { setNeedsApply(reload: true) } }
    }

    /// A snapshot saved earlier from `onSnapshot`. Read when the widget (re)loads.
    public var snapshot: PrismSnapshot?

    /// nil = follow the trait collection (system light/dark).
    public var colorScheme: UIUserInterfaceStyle? {
        didSet { if colorScheme != oldValue { setNeedsApply(reload: false) } }
    }

    public var onEffect: ((PrismEffect) -> Void)?
    public var onSnapshot: ((PrismSnapshot) -> Void)?
    public var onHeightChange: ((CGFloat) -> Void)?

    /// Last height reported by the widget (points). Starts at the snapshot's height, else 0 until
    /// the first layout.
    public private(set) var contentHeight: CGFloat = 0

    // MARK: Internals

    private let widget: PRSPrismWidget
    private let context: PRSPrismWidgetContext
    private var applyScheduled = false
    private var pendingReload = false
    private var pendingRedraw = false
    /// What the current view model was built from (for tests and change detection).
    private(set) var loadedEnvelopeJSON: String
    private(set) var loadedInstanceId: String
    private(set) var appliedColorScheme: String
    private var appliedTheme: String?
    private var themeObserver: NSObjectProtocol?
    private(set) var loadCount = 1

    public init(envelopeJSON: String, instanceId: String, snapshot: PrismSnapshot? = nil) {
        self.envelopeJSON = envelopeJSON
        self.instanceId = instanceId
        self.snapshot = snapshot
        self.loadedEnvelopeJSON = envelopeJSON
        self.loadedInstanceId = instanceId
        // With a snapshot the widget starts at its old height, so a list doesn't jump.
        self.contentHeight = snapshot?.height ?? 0

        let scheme = PrismWidgetView.schemeString(UITraitCollection.current.userInterfaceStyle)
        self.appliedColorScheme = scheme
        let vm = PRSPrismWidgetViewModel(envelopeJson: envelopeJSON, instanceId: instanceId)
        vm.snapshotJson = snapshot?.json
        vm.libraryJs = Prism.library
        vm.themeJson = Prism.theme?.json
        vm.colorScheme = scheme
        let box = WeakBox()
        let ctx = PrismWidgetView.makeContext(box)
        self.context = ctx
        self.widget = PRSPrismWidget(viewModel: vm, componentContext: ctx, runtime: Prism.runtime)

        super.init(frame: .zero)
        backgroundColor = .clear
        clipsToBounds = true
        addSubview(widget)
        box.view = self
        appliedTheme = Prism.theme?.json
        // A new brand from the app: redraw (no reload, state stays).
        themeObserver = NotificationCenter.default.addObserver(forName: Prism.themeDidChange, object: nil, queue: .main) { [weak self] _ in
            self?.setNeedsApply(reload: false)
        }
        if #available(iOS 17.0, *) {
            registerForTraitChanges([UITraitUserInterfaceStyle.self]) { (view: PrismWidgetView, _) in
                view.traitStyleChanged()
            }
            // The phone's text size (Dynamic Type): Valdi rescales every font once it knows it.
            registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) { (view: PrismWidgetView, _) in
                view.widget.updateTraitCollection()
            }
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    deinit {
        if let themeObserver { NotificationCenter.default.removeObserver(themeObserver) }
        // The Valdi root view destroys its context when it deallocates (right after this).
    }

    // MARK: Layout

    public override var intrinsicContentSize: CGSize {
        CGSize(width: UIView.noIntrinsicMetric, height: contentHeight)
    }

    public override func sizeThatFits(_ size: CGSize) -> CGSize {
        CGSize(width: size.width, height: contentHeight)
    }

    public override func layoutSubviews() {
        applyIfNeeded()
        super.layoutSubviews()
        layoutWidget()
    }

    /// Valdi measures the content inside the root view's frame and shrinks it to fit, and does
    /// not lay out at all while the root is 0 tall. So the inner root is always much taller
    /// than the content; it is transparent and clipped by this view.
    static let measureSlack: CGFloat = 2000

    private func layoutWidget() {
        let h = max(bounds.height, contentHeight + PrismWidgetView.measureSlack)
        let frame = CGRect(x: 0, y: 0, width: bounds.width, height: h)
        if widget.frame != frame { widget.frame = frame }
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        // Valdi only scales text with the phone's text size once it is given the trait collection.
        if window != nil { widget.updateTraitCollection() }
        if colorScheme == nil { traitStyleChanged() }
    }

    public override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if #available(iOS 17.0, *) { return } // handled by registerForTraitChanges
        if previousTraitCollection?.preferredContentSizeCategory != traitCollection.preferredContentSizeCategory {
            widget.updateTraitCollection()
        }
        if previousTraitCollection?.userInterfaceStyle != traitCollection.userInterfaceStyle {
            traitStyleChanged()
        }
    }

    // MARK: Applying changes

    /// The colour scheme string passed to the widget right now ("light" / "dark").
    var resolvedColorScheme: String {
        PrismWidgetView.schemeString(colorScheme ?? traitCollection.userInterfaceStyle)
    }

    static func schemeString(_ style: UIUserInterfaceStyle) -> String {
        style == .dark ? "dark" : "light"
    }

    private func traitStyleChanged() {
        guard colorScheme == nil, resolvedColorScheme != appliedColorScheme else { return }
        setNeedsApply(reload: false)
    }

    private func setNeedsApply(reload: Bool) {
        if reload { pendingReload = true } else { pendingRedraw = true }
        setNeedsLayout()
        guard !applyScheduled else { return }
        applyScheduled = true
        DispatchQueue.main.async { [weak self] in self?.applyIfNeeded() }
    }

    /// Applies pending property changes now. Called automatically; exposed for tests.
    func applyIfNeeded() {
        applyScheduled = false
        guard pendingReload || pendingRedraw else { return }
        let reload = pendingReload
        pendingReload = false
        pendingRedraw = false

        let scheme = resolvedColorScheme
        let themeJSON = Prism.theme?.json
        if !reload && scheme == appliedColorScheme && themeJSON == appliedTheme { return }
        appliedTheme = themeJSON

        let vm = PRSPrismWidgetViewModel(envelopeJson: envelopeJSON, instanceId: instanceId)
        vm.snapshotJson = snapshot?.json
        vm.libraryJs = Prism.library
        vm.themeJson = Prism.theme?.json
        vm.colorScheme = scheme
        appliedColorScheme = scheme
        if reload {
            loadedEnvelopeJSON = envelopeJSON
            loadedInstanceId = instanceId
            loadCount += 1
        }
        widget.viewModel = vm
    }

    // MARK: Callbacks

    /// The context's blocks must be set before the widget is created (Valdi copies them to
    /// JS at creation), which is before `self` exists, so they go through a weak box.
    private final class WeakBox {
        weak var view: PrismWidgetView?
    }

    private static func makeContext(_ box: WeakBox) -> PRSPrismWidgetContext {
        let ctx = PRSPrismWidgetContext()
        ctx.onContentHeight = { h in
            onMain { box.view?.heightReported(CGFloat(h)) }
        }
        ctx.onEffect = { type, value in
            onMain { box.view?.onEffect?(PrismEffect(type: type, value: value)) }
        }
        ctx.onSnapshot = { json in
            onMain { if let snap = PrismSnapshot(json: json) { box.view?.onSnapshot?(snap) } }
        }
        return ctx
    }

    func heightReported(_ h: CGFloat) {
        let height = max(0, h.isFinite ? h : 0)
        guard abs(height - contentHeight) > 0.25 else { return }
        contentHeight = height
        invalidateIntrinsicContentSize()
        setNeedsLayout()
        superview?.setNeedsLayout()
        onHeightChange?(height)
    }

    private static func onMain(_ f: @escaping () -> Void) {
        if Thread.isMainThread { f() } else { DispatchQueue.main.async(execute: f) }
    }
}

