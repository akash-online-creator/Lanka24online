import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_foreground_task/flutter_foreground_task.dart' hide NotificationVisibility;
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'services/background_location_handler.dart';
import 'overlay/floating_overlay_widget.dart';

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
  bool _isServiceRunning = false;
  bool _isOverlayActive = false;
  bool _isLoading = true;
  double? _lastLat;
  double? _lastLng;

  @override
  void initState() {
    super.initState();
    _initWebview();
    _initForegroundTask();
    _autoStartBackgroundServices();
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

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_location_channel',
        channelName: 'සහය සේවා 24/7 Location Service',
        channelDescription: 'Maintains background safety & disaster awareness',
        channelImportance: NotificationChannelImportance.HIGH,
        priority: NotificationPriority.HIGH,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(10000),
        autoRunOnBoot: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  Future<void> _autoStartBackgroundServices() async {
    try {
      await Permission.location.request();
      await Permission.locationAlways.request();
      await Permission.notification.request();

      try {
        Position initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 8),
        );
        _injectLocationIntoWebView(initialPos.latitude, initialPos.longitude, initialPos.accuracy);
      } catch (e) {
        debugPrint('Initial pos notice: $e');
      }

      if (!await FlutterForegroundTask.isRunningService) {
        FlutterForegroundTask.addTaskDataCallback((data) {
          if (data is Map) {
            FlutterOverlayWindow.shareData(data);
            if (data.containsKey('latitude') && data.containsKey('longitude')) {
              _injectLocationIntoWebView(
                data['latitude'] as double,
                data['longitude'] as double,
                (data['accuracy'] ?? 10.0) as double,
              );
            }
          }
        });

        await FlutterForegroundTask.startService(
          notificationTitle: '🚨 සහය සේවා Live Guard සක්‍රීයයි',
          notificationText: 'පසුබිමේ සජීවී ස්ථාන දත්ත සහ ආරක්ෂණ පද්ධතිය ක්‍රියාත්මකයි...',
          callback: startLocationCallback,
        );
        setState(() => _isServiceRunning = true);
      }
    } catch (e) {
      debugPrint('Background init notice: $e');
    }
  }

  Future<void> _toggleFloatingOverlay() async {
    bool hasPermission = await FlutterOverlayWindow.isPermissionGranted();
    if (!hasPermission) {
      await FlutterOverlayWindow.requestPermission();
      return;
    }

    if (await FlutterOverlayWindow.isActive()) {
      await FlutterOverlayWindow.closeOverlay();
      setState(() => _isOverlayActive = false);
    } else {
      await FlutterOverlayWindow.showOverlay(
        enableDrag: true,
        overlayTitle: "සහය සේවා Floating Radar",
        overlayContent: "විස්තර බැලීමට ඔබන්න",
        flag: OverlayFlag.defaultFlag,
        alignment: OverlayAlignment.centerRight,
        visibility: NotificationVisibility.visibilityPublic,
        positionGravity: PositionGravity.auto,
        width: 70,
        height: 70,
      );
      setState(() => _isOverlayActive = true);
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
            Positioned(
              bottom: 20,
              right: 20,
              child: FloatingActionButton.extended(
                backgroundColor: const Color(0xFF007A4B),
                foregroundColor: Colors.white,
                onPressed: _toggleFloatingOverlay,
                icon: const Icon(Icons.picture_in_picture_alt),
                label: Text(_isOverlayActive ? "Radar සඟවන්න" : "Floating Radar"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
