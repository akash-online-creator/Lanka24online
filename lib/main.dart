import 'dart:io';

import 'package:flutter/material.dart';

import 'package:flutter/services.dart';

import 'package:local_asset_server/local_asset_server.dart';

import 'package:webview_flutter/webview_flutter.dart';

void main() async {

  WidgetsFlutterBinding.ensureInitialized();

  runApp(const MyApp());

}

class MyApp extends StatelessWidget {

  const MyApp({super.key});

  @override

  Widget build(BuildContext context) {

    return MaterialApp(

      title: 'Local Asset Webview',

      theme: ThemeData(

        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),

        useMaterial3: true,

      ),

      home: const LocalWebPage(),

    );

  }

}

class LocalWebPage extends StatefulWidget {

  const LocalWebPage({super.key});

  @override

  State<LocalWebPage> createState() => _LocalWebPageState();

}

class _LocalWebPageState extends State<LocalWebPage> {

  LocalAssetServer? _server;

  WebViewController? _webViewController;

  

  bool _isServerRunning = false;

  String? _serverAddress;

  int? _serverPort;

  String? _errorMessage;

  @override

  void initState() {

    super.initState();

    _initServer();

  }

  /// Initializes the local asset server before mounting the WebView

  /// to prevent blank white screens caused by failed initial HTTP requests.

  Future<void> _initServer() async {

    try {

      // Find an available port dynamically to prevent socket binding collisions

      final server = await LocalAssetServer.start(

        address: InternetAddress.loopbackIPv4,

        assetsBasePath: 'assets/web/',

        port: 0, // Port 0 allows the OS to assign an available dynamic port

      );

      final address = server.address.address;

      final port = server.port;

      final controller = WebViewController()

        ..setJavaScriptMode(JavaScriptMode.unrestricted)

        ..setBackgroundColor(const Color(0x00000000))

        ..setNavigationDelegate(

          NavigationDelegate(

            onPageStarted: (String url) {

              debugPrint('WebView started loading: $url');

            },

            onPageFinished: (String url) {

              debugPrint('WebView finished loading: $url');

            },

            onWebResourceError: (WebResourceError error) {

              debugPrint('WebView resource error: ${error.description}');

            },

          ),

        );

      // Load the root entrypoint after server binding is confirmed

      await controller.loadRequest(Uri.parse('http://$address:$port/index.html'));

      if (mounted) {

        setState(() {

          _server = server;

          _serverAddress = address;

          _serverPort = port;

          _webViewController = controller;

          _isServerRunning = true;

        });

      }

    } catch (e, stackTrace) {

      debugPrint('Failed to start LocalAssetServer: $e\n$stackTrace');

      if (mounted) {

        setState(() {

          _errorMessage = e.toString();

          _isServerRunning = false;

        });

      }

    }

  }

  @override

  void dispose() {

    _server?.stop();

    super.dispose();

  }

  @override

  Widget build(BuildContext context) {

    return Scaffold(

      appBar: AppBar(

        title: const Text('Local Asset Server'),

        actions: [

          if (_isServerRunning)

            IconButton(

              icon: const Icon(Icons.refresh),

              onPressed: () => _webViewController?.reload(),

            ),

        ],

      ),

      body: _buildBody(),

    );

  }

  Widget _buildBody() {

    if (_errorMessage != null) {

      return Center(

        child: Padding(

          padding: const EdgeInsets.all(16.0),

          child: Column(

            mainAxisAlignment: MainAxisAlignment.center,

            children: [

              const Icon(Icons.error_outline, color: Colors.red, size: 48),

              const SizedBox(height: 16),

              Text(

                'Failed to start local asset server',

                style: Theme.of(context).textTheme.titleMedium,

              ),

              const SizedBox(height: 8),

              Text(

                _errorMessage!,

                textAlign: TextAlign.center,

                style: const TextStyle(color: Colors.grey),

              ),

              const SizedBox(height: 16),

              ElevatedButton(

                onPressed: () {

                  setState(() {

                    _errorMessage = null;

                  });

                  _initServer();

                },

                child: const Text('Retry'),

              ),

            ],

          ),

        ),

      );

    }

    if (!_isServerRunning || _webViewController == null) {

|---|const Center(

        child: Column(

          mainAxisAlignment: MainAxisAlignment.center,

          children: [

            CircularProgressIndicator(),

            SizedBox(height: 16),

            Text('Starting local server...'),

          ],

        ),

      );

    }

    return WebViewWidget(controller: _webViewController!);

  }

}
