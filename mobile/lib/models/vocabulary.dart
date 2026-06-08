class Vocabulary {
  final int id;
  final String word;
  final String meaningBn;
  final String difficulty;
  final String exampleSentence;
  final String? sourceSentence;
  final String? articleTitle;
  final String? articleSource;

  Vocabulary({
    required this.id,
    required this.word,
    required this.meaningBn,
    required this.difficulty,
    required this.exampleSentence,
    this.sourceSentence,
    this.articleTitle,
    this.articleSource,
  });

  factory Vocabulary.fromJson(Map<String, dynamic> json) => Vocabulary(
        id: json['id'] as int,
        word: json['word'] as String,
        meaningBn: json['meaningBn'] as String,
        difficulty: json['difficulty'] as String,
        exampleSentence: json['exampleSentence'] as String,
        sourceSentence: json['sourceSentence'] as String?,
        articleTitle: json['articleTitle'] as String?,
        articleSource: json['articleSource'] as String?,
      );
}
