import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/article.dart';
import '../services/api_service.dart';
import 'article_screen.dart';
import 'vocabulary_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _api = ApiService();
  late Future<List<Article>> _articlesFuture;

  @override
  void initState() {
    super.initState();
    _articlesFuture = _api.fetchLatestArticles();
  }

  Future<void> _refresh() async {
    setState(() {
      _articlesFuture = _api.fetchLatestArticles();
    });
    await _articlesFuture;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Today's Editorials"),
        actions: [
          IconButton(
            icon: const Icon(Icons.menu_book_outlined),
            tooltip: 'Vocabulary',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const VocabularyScreen()),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Article>>(
          future: _articlesFuture,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Failed to load: ${snap.error}'),
                ),
              ]);
            }
            final articles = snap.data ?? [];
            if (articles.isEmpty) {
              return ListView(children: const [
                Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    "No processed articles yet. Run the pipeline:\n\n"
                    "POST /health/run-pipeline\n\nor `npm run pipeline:run` on the backend.",
                  ),
                ),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: articles.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) => _ArticleTile(article: articles[i]),
            );
          },
        ),
      ),
    );
  }
}

class _ArticleTile extends StatelessWidget {
  const _ArticleTile({required this.article});
  final Article article;

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat.MMMd().format(article.publishedAt.toLocal());
    return ListTile(
      title: Text(article.title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          children: [
            Text(article.source, style: const TextStyle(fontWeight: FontWeight.w500)),
            const Text('  •  '),
            Text(dateLabel),
            const Text('  •  '),
            Text('${article.sentenceCount} lines'),
          ],
        ),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ArticleScreen(article: article)),
      ),
    );
  }
}
