// Web / iOS sim / macOS reach the host backend via localhost.
// Android emulator routes the host machine to 10.0.2.2 — override at run time:
//   flutter run -d <android-device> --dart-define=API_BASE_URL=http://10.0.2.2:3000
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );
}
