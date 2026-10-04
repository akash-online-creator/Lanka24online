import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

// Top-level entry point required for flutter_foreground_task 9.x background execution
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(SahayaForegroundTaskHandler());
}

class SahayaForegroundTaskHandler extends TaskHandler {
  int _counter = 0;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('Sahaya Sewa 24/7 Foreground Service started at: $timestamp (starter: $starter)');
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp) async {
    _counter++;
    // Perform silent background radar check every 15 seconds
    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      debugPrint('24/7 Radar Silent GPS Sync #$_counter: ${position.latitude}, ${position.longitude}');

      // Update background notification status
      FlutterForegroundTask.updateService(
        notificationTitle: '🚨 සහය සේවා 24/7 ආරක්ෂක සේවය සක්‍රීයයි',
        notificationText: 'GPS ස්ථානය යාවත්කාලීනයි (${position.latitude.toStringAsFixed(2)}, ${position.longitude.toStringAsFixed(2)}) - ආපදා නිරීක්ෂණය වේ',
      );
    } catch (e) {
      debugPrint('Background location check error: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    debugPrint('Sahaya Sewa Foreground Service stopped (isTimeout: $isTimeout)');
  }
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SahayaSewaApp());
}

class SahayaSewaApp extends StatelessWidget {
  const SahayaSewaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'සහය සේවා (Sahaya Seva)',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF020617),
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFFDC2626),
          secondary: const Color(0xFFF59E0B),
          surface: const Color(0xFF0F172A),
        ),
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
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _requestAllMobilePermissions();
    _initForegroundTask();
    _initWebView();
  }

  Future<void> _requestAllMobilePermissions() async {
    try {
      // Request all required mobile permissions
      await [
        Permission.location,
        Permission.locationAlways,
        Permission.notification,
        Permission.microphone,
        Permission.ignoreBatteryOptimizations,
      ].request();

      // Battery Optimization Exemption for 24/7 Background Persistence
      if (await Permission.ignoreBatteryOptimizations.isDenied) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }

      // Start 24/7 Foreground Service
      _startForegroundService();
    } catch (e) {
      debugPrint('Error requesting permissions: $e');
    }
  }

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_24x7_radar',
        channelName: 'සහය සේවා 24/7 ආරක්ෂක සේවය',
        channelDescription: 'හදිසි ආපදා හා අනතුරු ඇඟවීම් පසුබිමින් 24/7 නිරීක්ෂණය කරන සේවාව',
        channelImportance: NotificationChannelImportance.HIGH,
        priority: NotificationPriority.HIGH,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(15000), // 15 seconds interval
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  Future<void> _startForegroundService() async {
    try {
      if (await FlutterForegroundTask.isRunningService) {
        return;
      }
      await FlutterForegroundTask.startService(
        serviceId: 256,
        notificationTitle: '🚨 සහය සේවා 24/7 ආරක්ෂක සේවය සක්‍රීයයි',
        notificationText: 'ආපදා හා හදිසි අනතුරු ඇඟවීම් පසුබිමින් නිරීක්ෂණය වේ',
        callback: startCallback,
      );
    } catch (e) {
      debugPrint('Error starting foreground service: $e');
    }
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF020617))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
              _errorMessage = null;
            });
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('Web resource error: ${error.description}');
            // If local asset loads, ignore minor network resource warnings
          },
          onNavigationRequest: (NavigationRequest request) {
            if (request.url.startsWith('tel:') || request.url.startsWith('mailto:')) {
              launchUrl(Uri.parse(request.url));
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      );

    // Platform-specific configuration for Android WebView (Audio, Geolocation, Permissions)
    if (_webViewController.platform is AndroidWebViewController) {
      final androidController = _webViewController.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async => const GeolocationPermissionsResponse(
          allow: true,
          retain: true,
        ),
      );
      androidController.setOnPlatformPermissionRequest((request) {
        request.grant();
      });
    }

    _loadWebApp();
  }

  Future<void> _loadWebApp() async {
    try {
      // Load bundled single-file HTML directly with https://localhost baseUrl to prevent Android WebView file:// CORS restrictions
      try {
        final htmlContent = await rootBundle.loadString('assets/web/index.html');
        await _webViewController.loadHtmlString(
          htmlContent,
          baseUrl: 'https://localhost/',
        );
      } catch (bundleError) {
        debugPrint('Direct string load note, falling back to asset loader: $bundleError');
        await _webViewController.loadFlutterAsset('assets/web/index.html');
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'යෙදුම පූරණය කිරීමේදී ගැටලුවක් ඇතිවිය: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        top: false,
        child: Stack(
          children: [
            WebViewWidget(controller: _webViewController),
            if (_isLoading)
              Container(
                color: const Color(0xFF020617),
                child: const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(
                        color: Color(0xFFDC2626),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'සහය සේවා පූරණය වෙමින් පවතී...',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (_errorMessage != null)
              Container(
                color: const Color(0xFF020617),
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 14),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadWebApp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                        ),
                        child: const Text('නැවත උත්සාහ කරන්න', style: TextStyle(color: Colors.white)),
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
