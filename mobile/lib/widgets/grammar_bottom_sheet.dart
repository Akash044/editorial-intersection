import 'package:flutter/material.dart';
import '../models/sentence.dart';
import 'vocab_card.dart';

class GrammarBottomSheet extends StatelessWidget {
  const GrammarBottomSheet({super.key, required this.sentence});
  final Sentence sentence;

  @override
  Widget build(BuildContext context) {
    final g = sentence.grammar;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (_, controller) => ListView(
        controller: controller,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        children: [
          Text(sentence.original,
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(sentence.translation,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    fontStyle: FontStyle.italic,
                    color: Theme.of(context).colorScheme.primary,
                  )),
          const Divider(height: 32),
          _SectionHeader(icon: Icons.menu_book_outlined, title: 'Grammar'),
          const SizedBox(height: 8),
          Text(g.breakdown),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (g.tense.isNotEmpty) _Pill(label: 'Tense', value: g.tense),
              if (g.sentenceType.isNotEmpty) _Pill(label: 'Type', value: g.sentenceType),
              if (g.subject.isNotEmpty) _Pill(label: 'Subject', value: g.subject),
              if (g.verb.isNotEmpty) _Pill(label: 'Verb', value: g.verb),
              if (g.object.isNotEmpty) _Pill(label: 'Object', value: g.object),
            ],
          ),
          if (sentence.vocabulary.isNotEmpty) ...[
            const Divider(height: 32),
            _SectionHeader(icon: Icons.translate, title: 'Vocabulary'),
            const SizedBox(height: 8),
            ...sentence.vocabulary.map((v) => VocabCard(word: v)),
          ],
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.icon, required this.title});
  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
      const SizedBox(width: 8),
      Text(title, style: Theme.of(context).textTheme.titleMedium),
    ]);
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: RichText(
        text: TextSpan(
          style: Theme.of(context).textTheme.bodySmall,
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(text: value),
          ],
        ),
      ),
    );
  }
}
