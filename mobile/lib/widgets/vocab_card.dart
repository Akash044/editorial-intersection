import 'package:flutter/material.dart';
import '../models/vocabulary.dart';

class VocabCard extends StatelessWidget {
  const VocabCard({super.key, required this.word});
  final Vocabulary word;

  Color _difficultyColor(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    switch (word.difficulty) {
      case 'advanced':
        return scheme.errorContainer;
      case 'intermediate':
        return scheme.tertiaryContainer;
      default:
        return scheme.secondaryContainer;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    word.word,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _difficultyColor(context),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    word.difficulty,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(word.meaningBn),
            const SizedBox(height: 8),
            Text(
              word.exampleSentence,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            if (word.articleSource != null) ...[
              const SizedBox(height: 6),
              Text(
                'From ${word.articleSource}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
