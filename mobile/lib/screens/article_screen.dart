import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/article.dart';
import '../models/sentence.dart';
import '../services/api_service.dart';
import '../widgets/sentence_tile.dart';
import '../widgets/grammar_bottom_sheet.dart';

class ArticleScreen extends StatefulWidget {
  const ArticleScreen({super.key, required this.article});
  final Article article;

  @override
  State<ArticleScreen> createState() => _ArticleScreenState();
}

class _ArticleScreenState extends State<ArticleScreen> {
  final _api = ApiService();
  late Future<List<Sentence>> _sentencesFuture;

  @override
  void initState() {
    super.initState();
    _sentencesFuture = _api.fetchSentences(widget.article.id);
  }

  void _showGrammar(Sentence s) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => GrammarBottomSheet(sentence: s),
    );
  }

  Future<void> _openOriginal() async {
    final uri = Uri.parse(widget.article.url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.article.source, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new),
            tooltip: 'Open original',
            onPressed: _openOriginal,
          ),
        ],
      ),
      body: FutureBuilder<List<Sentence>>(
        future: _sentencesFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Failed to load: ${snap.error}'));
          }
          final sentences = snap.data ?? [];
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: sentences.length + 1,
            itemBuilder: (_, i) {
              if (i == 0) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Text(
                    widget.article.title,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                );
              }
              final s = sentences[i - 1];
              return SentenceTile(sentence: s, onTap: () => _showGrammar(s));
            },
          );
        },
      ),
    );
  }
}
