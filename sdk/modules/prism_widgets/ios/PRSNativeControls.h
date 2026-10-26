// The platform's own UIKit controls, embedded in Valdi with <custom-view iosClass=...>.
// Used where users expect the exact iOS feel (CLIENTS.md section 4): Slider, Switch.
// PRSNativeButton is only an example for the demo (our renderer's Button is written once).
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// UISlider. Attributes: pValue, pMin, pMax, pStep (numbers), pTint (color), pDisabled (bool),
/// pOnChange (function(number)).
@interface PRSNativeSlider : UIView
@end

/// UISwitch. Attributes: pValue (bool), pTint (color), pDisabled (bool), pOnChange (function(bool)).
@interface PRSNativeSwitch : UIView
@end

/// A pull-down field: UIButton whose tap opens iOS's own menu (UIMenu) of the options.
/// Attributes: pItems (string: option labels, one per line), pSelected (number: index, -1 = none),
/// pPlaceholder (string), pColor / pMutedColor (color), pDisabled (bool), pOnChange (function(index)).
@interface PRSNativeSelect : UIView
@end

/// UIButton with UIButton.Configuration: filled / bordered / plain, and on iOS 26+ the "Liquid Glass"
/// styles (glass / prominent glass).
/// Attributes: pLabel (string), pVariant ("solid" | "outline" | "ghost" | "glass" | "glassProminent"),
/// pTint (color), pOnPress (function).
@interface PRSNativeButton : UIView
@end

NS_ASSUME_NONNULL_END
