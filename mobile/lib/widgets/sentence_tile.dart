import 'package:flutter/material.dart';
import '../models/sentence.dart';

class SentenceTile extends StatelessWidget {
  const SentenceTile({super.key, required this.sentence, required this.onTap});
  final Sentence sentence;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasVocab = sentence.vocabulary.isNotEmpty;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(sentence.original, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 6),
            Text(
              sentence.translation,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontStyle: FontStyle.italic,
                  ),
            ),
            if (hasVocab) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: -8,
                children: sentence.vocabulary
                    .map((v) => Chip(
                          label: Text(v.word, style: const TextStyle(fontSize: 12)),
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          visualDensity: VisualDensity.compact,
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
