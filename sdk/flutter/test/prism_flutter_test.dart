import 'package:flutter_test/flutter_test.dart';
import 'package:prism_flutter/prism_flutter.dart';

void main() {
  test('effects map from (type, value)', () {
    expect(PrismEffect.from('toast', 'hi'), const PrismToast('hi'));
    expect(PrismEffect.from('open', 'https://a.b'), isA<PrismOpen>());
    expect(PrismEffect.from('open', 'not a url'), isA<PrismOtherEffect>());
    expect(PrismEffect.from('copy', 'x').value, 'x');
    expect(PrismEffect.from('ask', 'why?'), const PrismAsk('why?'));
    expect(PrismEffect.from('new_thing', 'v').type, 'new_thing');
    final action = PrismEffect.from('action', '{"name":"send_email","args":{"to":"a@b.co","count":2}}');
    expect(action, isA<PrismAction>());
    expect((action as PrismAction).name, 'send_email');
    expect(action.args, {'to': 'a@b.co', 'count': 2});
    expect(PrismEffect.from('action', 'not json'), isA<PrismOtherEffect>());
  });

  test('snapshots are read, others ignored', () {
    final s = PrismSnapshot.fromJson('{"v":1,"height":120.5,"state":{}}');
    expect(s?.height, 120.5);
    expect(PrismSnapshot.fromJson('{"v":2}'), isNull);
    expect(PrismSnapshot.fromJson('nope'), isNull);
  });
}
