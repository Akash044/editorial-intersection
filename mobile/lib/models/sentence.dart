import 'grammar.dart';
import 'vocabulary.dart';

class Sentence {
  final int id;
  final int position;
  final String original;
  final String translation;
  final Grammar grammar;
  final List<Vocabulary> vocabulary;

  Sentence({
    required this.id,
    required this.position,
    required this.original,
    required this.translation,
    required this.grammar,
    required this.vocabulary,
  });

  factory Sentence.fromJson(Map<String, dynamic> json) => Sentence(
        id: json['id'] as int,
        position: json['position'] as int,
        original: json['original'] as String,
        translation: json['translation'] as String,
        grammar: Grammar.fromJson(json['grammar'] as Map<String, dynamic>),
        vocabulary: (json['vocabulary'] as List<dynamic>? ?? [])
            .map((v) => Vocabulary.fromJson(v as Map<String, dynamic>))
            .toList(),
      );
}
