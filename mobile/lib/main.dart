import 'package:flutter/material.dart';
import 'screens/home_screen.dart';
import 'services/notification_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.initialize();
  runApp(const EditorialIntersectionApp());
}

class EditorialIntersectionApp extends StatelessWidget {
  const EditorialIntersectionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Editorial Intersection',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1B5E20)),
        useMaterial3: true,
        textTheme: const TextTheme(
          bodyLarge: TextStyle(fontSize: 17, height: 1.5),
          bodyMedium: TextStyle(fontSize: 15, height: 1.5),
        ),
      ),
      home: const HomeScreen(),
    );
  }
}
