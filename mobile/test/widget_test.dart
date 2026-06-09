// Basic smoke test: the app builds and the home screen renders its app bar.
import 'package:flutter_test/flutter_test.dart';

import 'package:editorial_intersection/main.dart';

void main() {
  testWidgets('App builds and shows the home app bar', (WidgetTester tester) async {
    await tester.pumpWidget(const EditorialIntersectionApp());

    // HomeScreen fires a network fetch in initState; without a backend the
    // FutureBuilder simply shows a spinner. We only assert the shell rendered.
    expect(find.text("Today's Editorials"), findsOneWidget);
  });
}
