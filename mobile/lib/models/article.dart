class Article {
  final int id;
  final String source;
  final String title;
  final String url;
  final DateTime publishedAt;
  final int sentenceCount;

  Article({
    required this.id,
    required this.source,
    required this.title,
    required this.url,
    required this.publishedAt,
    required this.sentenceCount,
  });

  factory Article.fromJson(Map<String, dynamic> json) => Article(
        id: json['id'] as int,
        source: json['source'] as String,
        title: json['title'] as String,
        url: json['url'] as String,
        publishedAt: DateTime.parse(json['publishedAt'] as String),
        sentenceCount: (json['sentenceCount'] ?? 0) as int,
      );
}
