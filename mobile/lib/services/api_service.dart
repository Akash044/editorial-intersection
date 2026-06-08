import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/article.dart';
import '../models/sentence.dart';
import '../models/vocabulary.dart';

class ApiService {
  ApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Future<List<Article>> fetchLatestArticles() async {
    final res = await _client.get(Uri.parse('${ApiConfig.baseUrl}/api/articles/latest'));
    _ensureOk(res);
    final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
    return data.map((j) => Article.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<Article>> fetchArticlesByDate(DateTime date) async {
    final iso = date.toIso8601String().split('T').first;
    final res = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/api/articles?date=$iso'),
    );
    _ensureOk(res);
    final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
    return data.map((j) => Article.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<Sentence>> fetchSentences(int articleId) async {
    final res = await _client.get(
      Uri.parse('${ApiConfig.baseUrl}/api/articles/$articleId/sentences'),
    );
    _ensureOk(res);
    final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
    return data.map((j) => Sentence.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<List<Vocabulary>> fetchVocabulary({String? difficulty, int limit = 50}) async {
    final qs = <String, String>{'limit': '$limit'};
    if (difficulty != null) qs['difficulty'] = difficulty;
    final uri = Uri.parse('${ApiConfig.baseUrl}/api/vocabulary')
        .replace(queryParameters: qs);
    final res = await _client.get(uri);
    _ensureOk(res);
    final List<dynamic> data = jsonDecode(res.body) as List<dynamic>;
    return data.map((j) => Vocabulary.fromJson(j as Map<String, dynamic>)).toList();
  }

  Future<SyncStatus> triggerSync() async {
    final res = await _client.post(Uri.parse('${ApiConfig.baseUrl}/api/sync'));
    if (res.statusCode == 409) {
      // Already running — that's fine, the caller can poll.
      return getSyncStatus();
    }
    _ensureOk(res);
    return getSyncStatus();
  }

  Future<SyncStatus> getSyncStatus() async {
    final res = await _client.get(Uri.parse('${ApiConfig.baseUrl}/api/sync/status'));
    _ensureOk(res);
    return SyncStatus.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _ensureOk(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('API ${res.statusCode}: ${res.body}');
    }
  }
}

class SyncStatus {
  final bool running;
  final DateTime? lastStartedAt;
  final DateTime? lastFinishedAt;
  final String? lastError;
  final int articleCount;
  final int cacheCount;

  SyncStatus({
    required this.running,
    required this.lastStartedAt,
    required this.lastFinishedAt,
    required this.lastError,
    required this.articleCount,
    required this.cacheCount,
  });

  factory SyncStatus.fromJson(Map<String, dynamic> json) => SyncStatus(
        running: json['running'] as bool,
        lastStartedAt: json['lastStartedAt'] != null
            ? DateTime.parse(json['lastStartedAt'] as String)
            : null,
        lastFinishedAt: json['lastFinishedAt'] != null
            ? DateTime.parse(json['lastFinishedAt'] as String)
            : null,
        lastError: json['lastError'] as String?,
        articleCount: (json['articleCount'] ?? 0) as int,
        cacheCount: (json['cacheCount'] ?? 0) as int,
      );
}
