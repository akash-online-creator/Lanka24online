import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SahayaSewaApp());
}

class SahayaSewaApp extends StatelessWidget {
  const SahayaSewaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'සහය සේවා',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF007A4B)),
        useMaterial3: true,
      ),
      home: const MainAppScreen(),
    );
  }
}

class MainAppScreen extends StatefulWidget {
  const MainAppScreen({super.key});

  @override
  State<MainAppScreen> createState() => _MainAppScreenState();
}

class _MainAppScreenState extends State<MainAppScreen> {
  late final WebViewController _webViewController;
  bool _isLoading = true;
  StreamSubscription<Position>? _positionSubscription;
  double? _lastLat;
  double? _lastLng;

  @override
  void initState() {
    super.initState();
    _initWebview();
    _startSilentBackgroundRadar();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }

  void _initWebview() async {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF07130C))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            if (mounted) setState(() => _isLoading = false);
            if (_lastLat != null && _lastLng != null) {
              _injectLocationIntoWebView(_lastLat!, _lastLng!, 10.0);
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('WebView Error: ${error.description}');
          },
        ),
      );

    try {
      final String htmlContent = await rootBundle.loadString('assets/web/index.html');
      await _webViewController.loadHtmlString(htmlContent, baseUrl: 'https://sahayasewa.app');
    } catch (e) {
      debugPrint('Fallback loading: $e');
      await _webViewController.loadFlutterAsset('assets/web/index.html');
    }
  }

  void _injectLocationIntoWebView(double lat, double lng, double accuracy) {
    _lastLat = lat;
    _lastLng = lng;
    try {
      _webViewController.runJavaScript("""
        (function() {
          var payload = { lat: $lat, lng: $lng, accuracy: $accuracy };
          window.__sahaya_native_gps = payload;
          window.dispatchEvent(new CustomEvent('sahaya_native_gps', { detail: payload }));
          window.postMessage({ type: 'SAHAYA_NATIVE_GPS', lat: $lat, lng: $lng, accuracy: $accuracy }, '*');
        })();
      """);
    } catch (e) {
      debugPrint('JS location bridge error: $e');
    }
  }

  /// 24/7 Silent Background Guard (Google Find Hub style)
  Future<void> _startSilentBackgroundRadar() async {
    try {
      // Request location and background location permissions
      await Permission.location.request();
      if (await Permission.location.isGranted) {
        await Permission.locationAlways.request();
      }
      await Permission.notification.request();

      // 1. Fetch immediate initial coordinate
      try {
        Position initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 8),
        );
        _injectLocationIntoWebView(initialPos.latitude, initialPos.longitude, initialPos.accuracy);
      } catch (e) {
        debugPrint('Initial silent GPS error: $e');
      }

      // 2. Power-efficient 24/7 background location streaming (no annoying status bar spam)
      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          distanceFilter: 20, // Only triggers when moved 20 meters (conserves battery)
        ),
      ).listen((Position position) {
        _injectLocationIntoWebView(position.latitude, position.longitude, position.accuracy);
      }, onError: (e) {
        debugPrint('Silent location stream notice: $e');
      });
    } catch (e) {
      debugPrint('Silent background radar error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF07130C),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _webViewController),
            if (_isLoading)
              Container(
                color: const Color(0xFF07130C),
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(color: Color(0xFF007A4B)),
                      SizedBox(height: 16),
                      Text(
                        'සහය සේවා පූරණය වෙමින් පවතී...',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
