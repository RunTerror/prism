// Each class is a thin UIView holding one UIKit control. Valdi passes props in as attributes
// (bindAttributes below) and we call back into JS through function attributes (pOnChange, pOnPress).
#import "PRSNativeControls.h"

#import "valdi/ios/SCValdiAttributesBinder.h"
#import "valdi_core/SCValdiFunction.h"
#import "valdi_core/SCValdiMarshaller.h"

#include <math.h>

/// Calls a JS function with one number: fn(value).
static void PRSCallNumber(id<SCValdiFunction> fn, double value)
{
    if (!fn) return;
    SCValdiMarshallerScoped(m, {
        SCValdiMarshallerPushDouble(m, value);
        [fn performWithMarshaller:m];
    });
}

/// Calls a JS function with one true/false: fn(value).
static void PRSCallBool(id<SCValdiFunction> fn, BOOL value)
{
    if (!fn) return;
    SCValdiMarshallerScoped(m, {
        SCValdiMarshallerPushBool(m, value);
        [fn performWithMarshaller:m];
    });
}

/// Calls a JS function with no arguments: fn().
static void PRSCallVoid(id<SCValdiFunction> fn)
{
    if (!fn) return;
    SCValdiMarshallerScoped(m, { [fn performWithMarshaller:m]; });
}

#pragma mark - Slider

@implementation PRSNativeSlider {
    UISlider *_slider;
    double _value, _min, _max, _step, _lastSent;
    id<SCValdiFunction> _onChange;
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if ((self = [super initWithFrame:frame])) {
        _min = 0; _max = 100; _step = 1; _lastSent = NAN;
        _slider = [UISlider new];
        [_slider addTarget:self action:@selector(prs_changed) forControlEvents:UIControlEventValueChanged];
        [self addSubview:_slider];
    }
    return self;
}

/// Each slider keeps its own drag state, so Valdi must not reuse it for another slider.
- (BOOL)willEnqueueIntoValdiPool { return NO; }

/// Snap the raw position to `step` and keep it inside min..max.
- (double)prs_snap:(double)raw
{
    double step = _step > 0 ? _step : 1;
    double v = _min + round((raw - _min) / step) * step;
    return MIN(_max, MAX(_min, v));
}

- (void)prs_changed
{
    double v = [self prs_snap:_slider.value];
    if (v != _lastSent) {   // only send when the snapped value changes
        _lastSent = v;
        PRSCallNumber(_onChange, v);
    }
}

- (void)prs_apply
{
    _slider.minimumValue = (float)_min;
    _slider.maximumValue = (float)MAX(_max, _min + 1);
    if (!_slider.isTracking) _slider.value = (float)_value;  // don't fight the finger mid-drag
}

- (CGSize)sizeThatFits:(CGSize)size
{
    CGFloat w = isfinite(size.width) && size.width > 0 ? size.width : 200;
    return CGSizeMake(w, 34);
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _slider.frame = self.bounds;
}

+ (void)bindNumber:(NSString *)name binder:(id<SCValdiAttributesBinderProtocol>)binder
               set:(void (^)(PRSNativeSlider *view, double value))set fallback:(double)fallback
{
    [binder bindAttribute:name
        invalidateLayoutOnChange:NO
        withDoubleBlock:^BOOL(PRSNativeSlider *view, CGFloat value, id<SCValdiAnimatorProtocol> animator) {
            set(view, isfinite(value) ? value : fallback);
            [view prs_apply];
            return YES;
        }
        resetBlock:^(PRSNativeSlider *view, id<SCValdiAnimatorProtocol> animator) {
            set(view, fallback);
            [view prs_apply];
        }];
}

+ (void)bindAttributes:(id<SCValdiAttributesBinderProtocol>)binder
{
    [self bindNumber:@"pValue" binder:binder set:^(PRSNativeSlider *v, double x) { v->_value = x; } fallback:0];
    [self bindNumber:@"pMin" binder:binder set:^(PRSNativeSlider *v, double x) { v->_min = x; } fallback:0];
    [self bindNumber:@"pMax" binder:binder set:^(PRSNativeSlider *v, double x) { v->_max = x; } fallback:100];
    [self bindNumber:@"pStep" binder:binder set:^(PRSNativeSlider *v, double x) { v->_step = x; } fallback:1];
    [binder bindAttribute:@"pTint"
        invalidateLayoutOnChange:NO
        withColorBlock:^BOOL(PRSNativeSlider *view, UIColor *value, id<SCValdiAnimatorProtocol> animator) {
            view->_slider.minimumTrackTintColor = value;
            return YES;
        }
        resetBlock:^(PRSNativeSlider *view, id<SCValdiAnimatorProtocol> animator) {
            view->_slider.minimumTrackTintColor = nil;
        }];
    [binder bindAttribute:@"pDisabled"
        invalidateLayoutOnChange:NO
        withBoolBlock:^BOOL(PRSNativeSlider *view, BOOL value, id<SCValdiAnimatorProtocol> animator) {
            view->_slider.enabled = !value;
            return YES;
        }
        resetBlock:^(PRSNativeSlider *view, id<SCValdiAnimatorProtocol> animator) {
            view->_slider.enabled = YES;
        }];
    [binder bindAttribute:@"pOnChange"
        withFunctionBlock:^(PRSNativeSlider *view, id<SCValdiFunction> value) { view->_onChange = value; }
        resetBlock:^(PRSNativeSlider *view) { view->_onChange = nil; }];
}

@end

#pragma mark - Switch

@implementation PRSNativeSwitch {
    UISwitch *_switch;
    id<SCValdiFunction> _onChange;
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if ((self = [super initWithFrame:frame])) {
        _switch = [UISwitch new];
        [_switch addTarget:self action:@selector(prs_changed) forControlEvents:UIControlEventValueChanged];
        [self addSubview:_switch];
    }
    return self;
}

- (BOOL)willEnqueueIntoValdiPool { return NO; }

- (void)prs_changed { PRSCallBool(_onChange, _switch.isOn); }

/// The switch's own fixed size (51 x 31 on iPhone).
- (CGSize)sizeThatFits:(CGSize)size { return [_switch sizeThatFits:size]; }

- (void)layoutSubviews
{
    [super layoutSubviews];
    _switch.frame = (CGRect){CGPointZero, [_switch sizeThatFits:self.bounds.size]};
}

+ (void)bindAttributes:(id<SCValdiAttributesBinderProtocol>)binder
{
    [binder bindAttribute:@"pValue"
        invalidateLayoutOnChange:NO
        withBoolBlock:^BOOL(PRSNativeSwitch *view, BOOL value, id<SCValdiAnimatorProtocol> animator) {
            if (view->_switch.isOn != value) [view->_switch setOn:value animated:YES];
            return YES;
        }
        resetBlock:^(PRSNativeSwitch *view, id<SCValdiAnimatorProtocol> animator) {
            [view->_switch setOn:NO animated:NO];
        }];
    [binder bindAttribute:@"pTint"
        invalidateLayoutOnChange:NO
        withColorBlock:^BOOL(PRSNativeSwitch *view, UIColor *value, id<SCValdiAnimatorProtocol> animator) {
            view->_switch.onTintColor = value;
            return YES;
        }
        resetBlock:^(PRSNativeSwitch *view, id<SCValdiAnimatorProtocol> animator) {
            view->_switch.onTintColor = nil;
        }];
    [binder bindAttribute:@"pDisabled"
        invalidateLayoutOnChange:NO
        withBoolBlock:^BOOL(PRSNativeSwitch *view, BOOL value, id<SCValdiAnimatorProtocol> animator) {
            view->_switch.enabled = !value;
            return YES;
        }
        resetBlock:^(PRSNativeSwitch *view, id<SCValdiAnimatorProtocol> animator) {
            view->_switch.enabled = YES;
        }];
    [binder bindAttribute:@"pOnChange"
        withFunctionBlock:^(PRSNativeSwitch *view, id<SCValdiFunction> value) { view->_onChange = value; }
        resetBlock:^(PRSNativeSwitch *view) { view->_onChange = nil; }];
    [binder setPlaceholderViewMeasureDelegate:^UIView * {
        return [PRSNativeSwitch new];
    }];
}

@end

#pragma mark - Select

@implementation PRSNativeSelect {
    UIButton *_button;
    NSArray<NSString *> *_items;
    NSInteger _selected;
    NSString *_placeholder;
    UIColor *_color, *_mutedColor;
    id<SCValdiFunction> _onChange;
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if ((self = [super initWithFrame:frame])) {
        _items = @[]; _selected = -1; _placeholder = @"Choose…";
        _button = [UIButton buttonWithType:UIButtonTypeSystem];
        _button.showsMenuAsPrimaryAction = YES;  // a tap opens the menu
        _button.contentHorizontalAlignment = UIControlContentHorizontalAlignmentFill;
        [self addSubview:_button];
    }
    return self;
}

- (BOOL)willEnqueueIntoValdiPool { return NO; }

- (void)prs_update
{
    // The menu: one action per option, the chosen one ticked.
    NSMutableArray<UIAction *> *actions = [NSMutableArray array];
    __weak PRSNativeSelect *weakSelf = self;
    [_items enumerateObjectsUsingBlock:^(NSString *title, NSUInteger i, BOOL *stop) {
        UIAction *action = [UIAction actionWithTitle:title image:nil identifier:nil handler:^(UIAction *a) {
            PRSNativeSelect *s = weakSelf;
            if (s) PRSCallNumber(s->_onChange, (double)i);
        }];
        action.state = (NSInteger)i == self->_selected ? UIMenuElementStateOn : UIMenuElementStateOff;
        [actions addObject:action];
    }];
    _button.menu = [UIMenu menuWithChildren:actions];

    // The field: chosen label (or the placeholder, muted) and a chevron on the right.
    BOOL chosen = _selected >= 0 && _selected < (NSInteger)_items.count;
    UIButtonConfiguration *config = [UIButtonConfiguration plainButtonConfiguration];
    config.title = chosen ? _items[_selected] : _placeholder;
    config.baseForegroundColor = chosen ? _color : _mutedColor;
    config.image = [UIImage systemImageNamed:@"chevron.up.chevron.down"];
    config.imagePlacement = NSDirectionalRectEdgeTrailing;
    config.contentInsets = NSDirectionalEdgeInsetsMake(0, 12, 0, 12);
    _button.configuration = config;
}

- (CGSize)sizeThatFits:(CGSize)size
{
    CGFloat w = isfinite(size.width) && size.width > 0 ? size.width : 200;
    return CGSizeMake(w, 40);
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _button.frame = self.bounds;
}

+ (void)bindAttributes:(id<SCValdiAttributesBinderProtocol>)binder
{
    [binder bindAttribute:@"pItems"
        invalidateLayoutOnChange:NO
        withStringBlock:^BOOL(PRSNativeSelect *view, NSString *value, id<SCValdiAnimatorProtocol> animator) {
            view->_items = value.length ? [value componentsSeparatedByString:@"\n"] : @[];
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_items = @[];
            [view prs_update];
        }];
    [binder bindAttribute:@"pSelected"
        invalidateLayoutOnChange:NO
        withDoubleBlock:^BOOL(PRSNativeSelect *view, CGFloat value, id<SCValdiAnimatorProtocol> animator) {
            view->_selected = isfinite(value) ? (NSInteger)value : -1;
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_selected = -1;
            [view prs_update];
        }];
    [binder bindAttribute:@"pPlaceholder"
        invalidateLayoutOnChange:NO
        withStringBlock:^BOOL(PRSNativeSelect *view, NSString *value, id<SCValdiAnimatorProtocol> animator) {
            view->_placeholder = value.length ? value : @"Choose…";
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_placeholder = @"Choose…";
            [view prs_update];
        }];
    [binder bindAttribute:@"pColor"
        invalidateLayoutOnChange:NO
        withColorBlock:^BOOL(PRSNativeSelect *view, UIColor *value, id<SCValdiAnimatorProtocol> animator) {
            view->_color = value;
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_color = nil;
            [view prs_update];
        }];
    [binder bindAttribute:@"pMutedColor"
        invalidateLayoutOnChange:NO
        withColorBlock:^BOOL(PRSNativeSelect *view, UIColor *value, id<SCValdiAnimatorProtocol> animator) {
            view->_mutedColor = value;
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_mutedColor = nil;
            [view prs_update];
        }];
    [binder bindAttribute:@"pDisabled"
        invalidateLayoutOnChange:NO
        withBoolBlock:^BOOL(PRSNativeSelect *view, BOOL value, id<SCValdiAnimatorProtocol> animator) {
            view->_button.enabled = !value;
            return YES;
        }
        resetBlock:^(PRSNativeSelect *view, id<SCValdiAnimatorProtocol> animator) {
            view->_button.enabled = YES;
        }];
    [binder bindAttribute:@"pOnChange"
        withFunctionBlock:^(PRSNativeSelect *view, id<SCValdiFunction> value) { view->_onChange = value; }
        resetBlock:^(PRSNativeSelect *view) { view->_onChange = nil; }];
}

@end

#pragma mark - Button (example only)

@implementation PRSNativeButton {
    UIButton *_button;
    NSString *_label, *_variant;
    UIColor *_tint;
    id<SCValdiFunction> _onPress;
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if ((self = [super initWithFrame:frame])) {
        _label = @""; _variant = @"solid";
        _button = [UIButton buttonWithType:UIButtonTypeSystem];
        [_button addTarget:self action:@selector(prs_tap) forControlEvents:UIControlEventTouchUpInside];
        [self addSubview:_button];
    }
    return self;
}

- (BOOL)willEnqueueIntoValdiPool { return NO; }

- (void)prs_tap { PRSCallVoid(_onPress); }

- (void)prs_update
{
    UIButtonConfiguration *config = nil;
    BOOL glass = NO;
    // iOS 26+: the system "Liquid Glass" styles. Older iOS falls back to filled / bordered below.
    if (@available(iOS 26.0, *)) {
        if ([_variant isEqualToString:@"glass"]) { config = [UIButtonConfiguration glassButtonConfiguration]; glass = YES; }
        else if ([_variant isEqualToString:@"glassProminent"]) { config = [UIButtonConfiguration prominentGlassButtonConfiguration]; glass = YES; }
    }
    if (!config) {
        if ([_variant isEqualToString:@"outline"] || [_variant isEqualToString:@"glass"]) config = [UIButtonConfiguration borderedButtonConfiguration];
        else if ([_variant isEqualToString:@"ghost"]) config = [UIButtonConfiguration plainButtonConfiguration];
        else config = [UIButtonConfiguration filledButtonConfiguration];
    }
    config.title = _label;
    if (_tint) {
        if (glass) _button.tintColor = _tint;  // glass takes its tint from the button
        else if ([_variant isEqualToString:@"solid"]) config.baseBackgroundColor = _tint;
        else config.baseForegroundColor = _tint;
    }
    _button.configuration = config;
    [self setNeedsLayout];
}

/// The button's own natural size (Valdi asks this to lay it out).
- (CGSize)sizeThatFits:(CGSize)size
{
    CGSize s = [_button sizeThatFits:CGSizeMake(CGFLOAT_MAX, CGFLOAT_MAX)];
    return CGSizeMake(ceil(s.width), ceil(s.height));
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _button.frame = self.bounds;
}

+ (void)bindAttributes:(id<SCValdiAttributesBinderProtocol>)binder
{
    [binder bindAttribute:@"pLabel"
        invalidateLayoutOnChange:YES
        withStringBlock:^BOOL(PRSNativeButton *view, NSString *value, id<SCValdiAnimatorProtocol> animator) {
            view->_label = value ?: @"";
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeButton *view, id<SCValdiAnimatorProtocol> animator) {
            view->_label = @"";
            [view prs_update];
        }];
    [binder bindAttribute:@"pVariant"
        invalidateLayoutOnChange:YES
        withStringBlock:^BOOL(PRSNativeButton *view, NSString *value, id<SCValdiAnimatorProtocol> animator) {
            view->_variant = value ?: @"solid";
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeButton *view, id<SCValdiAnimatorProtocol> animator) {
            view->_variant = @"solid";
            [view prs_update];
        }];
    [binder bindAttribute:@"pTint"
        invalidateLayoutOnChange:NO
        withColorBlock:^BOOL(PRSNativeButton *view, UIColor *value, id<SCValdiAnimatorProtocol> animator) {
            view->_tint = value;
            [view prs_update];
            return YES;
        }
        resetBlock:^(PRSNativeButton *view, id<SCValdiAnimatorProtocol> animator) {
            view->_tint = nil;
            [view prs_update];
        }];
    [binder bindAttribute:@"pOnPress"
        withFunctionBlock:^(PRSNativeButton *view, id<SCValdiFunction> value) { view->_onPress = value; }
        resetBlock:^(PRSNativeButton *view) { view->_onPress = nil; }];
    // Measure with a throwaway instance so Valdi knows the button's natural size.
    [binder setPlaceholderViewMeasureDelegate:^UIView * {
        return [PRSNativeButton new];
    }];
}

@end
