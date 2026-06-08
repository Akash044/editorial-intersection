class Grammar {
  final String subject;
  final String verb;
  final String object;
  final String tense;
  final String sentenceType;
  final String breakdown;

  Grammar({
    required this.subject,
    required this.verb,
    required this.object,
    required this.tense,
    required this.sentenceType,
    required this.breakdown,
  });

  factory Grammar.fromJson(Map<String, dynamic> json) => Grammar(
        subject: (json['subject'] ?? '') as String,
        verb: (json['verb'] ?? '') as String,
        object: (json['object'] ?? '') as String,
        tense: (json['tense'] ?? '') as String,
        sentenceType: (json['sentenceType'] ?? '') as String,
        breakdown: (json['breakdown'] ?? '') as String,
      );
}
