import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static Future<void> initialize() async {
    // Web subscribeToTopic is unsupported and FCM web needs separate
    // VAPID config; skip entirely on web until that's wired.
    if (kIsWeb) return;
    try {
      await Firebase.initializeApp();
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission();
      await messaging.subscribeToTopic('daily_news');
    } catch (_) {
      // Firebase not configured yet — skip silently for dev runs.
    }
  }
}
