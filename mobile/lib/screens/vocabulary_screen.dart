import 'package:flutter/material.dart';
import '../models/vocabulary.dart';
import '../services/api_service.dart';
import '../widgets/vocab_card.dart';

class VocabularyScreen extends StatefulWidget {
  const VocabularyScreen({super.key});

  @override
  State<VocabularyScreen> createState() => _VocabularyScreenState();
}

class _VocabularyScreenState extends State<VocabularyScreen> {
  final _api = ApiService();
  String? _difficulty;
  late Future<List<Vocabulary>> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchVocabulary();
  }

  void _setDifficulty(String? d) {
    setState(() {
      _difficulty = d;
      _future = _api.fetchVocabulary(difficulty: d);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vocabulary'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _chip('All', null),
                _chip('Advanced', 'advanced'),
                _chip('Intermediate', 'intermediate'),
                _chip('Beginner', 'beginner'),
              ],
            ),
          ),
        ),
      ),
      body: FutureBuilder<List<Vocabulary>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Failed: ${snap.error}'));
          }
          final words = snap.data ?? [];
          if (words.isEmpty) {
            return const Center(child: Text('No vocabulary yet'));
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: words.length,
            itemBuilder: (_, i) => VocabCard(word: words[i]),
          );
        },
      ),
    );
  }

  Widget _chip(String label, String? value) {
    final selected = _difficulty == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => _setDifficulty(value),
      ),
    );
  }
}
