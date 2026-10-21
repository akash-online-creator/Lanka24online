import 'dart:convert';
// File: lib/main.dart (Optimized Battery, High-Precision GPS & Emergency Siren Architecture)
// ------------------------------------------------------------------------------------------

import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

// ==============================================================
// 🌐 1. LOCAL ASSET SERVER (Offline Safe Single-Port Loopback)
// ==============================================================
class LocalAssetServer {
  HttpServer? _server;
  static const int fixedPort = 8089;
  int get port => _server?.port ?? fixedPort;

  Future<int> start() async {
    try {
      try {
        _server = await HttpServer.bind(InternetAddress.loopbackIPv4, fixedPort, shared: true);
      } catch (e) {
        try {
          _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 8090, shared: true);
        } catch (_) {
          _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        }
      }
      _server!.listen((HttpRequest request) async {
        try {
          String path = request.uri.path;
          if (path == '/' || path.isEmpty) path = '/index.html';
          final assetPath = 'assets/web$path';

          try {
            final ByteData data = await rootBundle.load(assetPath);
            final List<int> bytes = data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes);

            // සියලුම වෙබ්, ශ්‍රව්‍ය (Audio) සහ රූප ආකෘති සඳහා නිවැරදි MIME Types
            String mimeType = 'text/html; charset=utf-8';
            if (path.endsWith('.js')) mimeType = 'application/javascript; charset=utf-8';
            else if (path.endsWith('.css')) mimeType = 'text/css; charset=utf-8';
            else if (path.endsWith('.json')) mimeType = 'application/json; charset=utf-8';
            else if (path.endsWith('.png')) mimeType = 'image/png';
            else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (path.endsWith('.webp')) mimeType = 'image/webp';
            else if (path.endsWith('.svg')) mimeType = 'image/svg+xml';
            else if (path.endsWith('.woff2')) mimeType = 'font/woff2';
            else if (path.endsWith('.mp3')) mimeType = 'audio/mpeg';
            else if (path.endsWith('.wav')) mimeType = 'audio/wav';
            else if (path.endsWith('.ogg')) mimeType = 'audio/ogg';

            request.response.headers.contentType = ContentType.parse(mimeType);
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.add(bytes);
            await request.response.close();
          } catch (_) {
            // Extension එකක් නොමැති SPA Routes සඳහා පමණක් index.html වෙත යොමු කිරීම (SyntaxError වැළැක්වීමට)
            if (!path.contains('.')) {
              final ByteData fallback = await rootBundle.load('assets/web/index.html');
              request.response.headers.contentType = ContentType.parse('text/html; charset=utf-8');
              request.response.add(fallback.buffer.asUint8List());
              await request.response.close();
            } else {
              request.response.statusCode = HttpStatus.notFound;
              await request.response.close();
            }
          }
        } catch (_) {
          request.response.statusCode = HttpStatus.internalServerError;
          await request.response.close();
        }
      });
      return _server!.port;
    } catch (_) {
      return 0;
    }
  }

  void stop() => _server?.close(force: true);
}

// ==============================================================
// 🚨 2. ON-DEMAND SOS LIVE TRACKING TASK (Only Runs When SOS is Active)
// ==============================================================
@pragma('vm:entry-point')
void startSosCallback() {
  FlutterForegroundTask.setTaskHandler(SahayaSosTaskHandler());
}

class SahayaSosTaskHandler extends TaskHandler {
  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('🚨 Sahaya Sewa On-Demand SOS Live Tracking Started');
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    try {
      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      FlutterForegroundTask.sendDataToMain({
        'lat': pos.latitude,
        'lng': pos.longitude,
        'accuracy': pos.accuracy,
      });
    } catch (e) {
      debugPrint('SOS GPS location scan notice: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {}

  @override
  void onReceiveData(Object data) {}

  @override
  void onNotificationButtonPressed(String id) {}

  @override
  void onNotificationPressed() {
    FlutterForegroundTask.launchApp();
  }

  @override
  void onNotificationDismissed() {}
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
      title: 'සහාය සේවා',
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

class _MainAppScreenState extends State<MainAppScreen> with WidgetsBindingObserver {
  final LocalAssetServer _assetServer = LocalAssetServer();
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initEmergencySirenChannel();
    _start24x7BackgroundAlertService();
    _requestAllInitialPermissions();
    _setupWebView();
    _startServerAndLoad();
  }

  // 1. App Launch Initial Permissions Auto-Request
  Future<void> _requestAllInitialPermissions() async {
    try {
      // Notification Permission (Android 13+)
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }

      // Location Permission (GPS)
      if (await Permission.location.isDenied) {
        await Permission.location.request();
      }

      // Battery Optimization Exemption
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
    } catch (e) {
      debugPrint('Initial permissions auto-request notice: $e');
    }
  }

  // 24/7 Background Emergency Radar & Battery Optimization Exemption
  Future<void> _start24x7BackgroundAlertService() async {
    try {
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
      if (!await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.startService(
          serviceId: 256,
          notificationTitle: 'සහාය සේවා - 24/7 ආපදා සේවාව ක්‍රියාත්මකයි 🛡️',
          notificationText: 'ආපදා හා අනතුරු ඇඟවීම් නිරීක්ෂණය කරමින් පසුබිමෙන් ක්‍රියාත්මක වේ.',
          callback: startSosCallback,
        );
      }
    } catch (e) {
      debugPrint('Background service setup notice: ');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _assetServer.stop();
    super.dispose();
  }

  // 3. High-Priority Emergency Notification Channel Initialization
  void _initEmergencySirenChannel() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_emergency_red_alert',
        channelName: 'රතු එළිය හදිසි ආපදා සයිරන් (Red Alert)',
        channelDescription: 'හදිසි ආපදා සහ ජීවිතාරක්ෂක පණිවුඩ සයිරන් නාදය සමඟින් පැය 24 පුරා අධීක්ෂණය කරයි.',
        channelImportance: NotificationChannelImportance.MAX,
        priority: NotificationPriority.MAX,
        enableVibration: true,
        playSound: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(showNotification: true, playSound: true),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(5000),
        autoRunOnBoot: false,
        allowWakeLock: true,
      ),
    );
  }

  Future<void> _startServerAndLoad() async {
    final port = await _assetServer.start();
    if (mounted && port > 0) {
      await _controller.loadRequest(Uri.parse('http://127.0.0.1:$port/'));
    } else {
      await _controller.loadFlutterAsset('assets/web/index.html');
    }
  }

  // 4. WebView Setup, External App Launchers & Native Channels
  void _setupWebView() {
    final WebViewController controller = WebViewController();

    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F172A))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) => setState(() => _isLoading = false),
          onNavigationRequest: (request) async {
            final url = request.url;
            // WhatsApp, Phone, SMS, Google Maps බාහිර ඇප්ස් මඟින් විවෘත කිරීම
            if (url.startsWith('whatsapp:') || 
                url.startsWith('tel:') || 
                url.startsWith('mailto:') || 
                url.startsWith('geo:') ||
                url.contains('wa.me') ||
                url.contains('maps.google.com') ||
                url.contains('goo.gl/maps')) {
              try {
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              } catch (_) {}
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..addJavaScriptChannel(
        'SahayaGpsChannel',
        onMessageReceived: (JavaScriptMessage message) async {
          if (message.message == 'GET_GPS' || message.message == 'FORCE_REFRESH') {
            _fetchAndInjectCurrentLocation();
          }
        },
      )
      ..addJavaScriptChannel(
        'SahayaNativeAlertChannel',
        onMessageReceived: (JavaScriptMessage message) async {
          final text = message.message;
          if (text == 'START_SOS_TRACKING') {
            await FlutterForegroundTask.startService(
              serviceId: 256,
              notificationTitle: 'සහාය සේවා - සජීවී SOS පිහිටීම විකාශනය වේ 🚨',
              notificationText: 'ඔබගේ ආරක්ෂාව උදෙසා ගලවාගන්නන් වෙත සජීවී පිහිටීම යොමු කෙරේ.',
              callback: startSosCallback,
            );
          } else if (text == 'STOP_SOS_TRACKING') {
            await FlutterForegroundTask.stopService();
          } else if (text.startsWith('TRIGGER_RED_ALERT')) {
            // 🚨 NATIVE EMERGENCY DISASTER ALARM: WAKES UP SCREEN & SOUNDS MAX SIREN
            try {
              String alertDetails = 'හදිසි ආපදා අනතුරු ඇඟවීමක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න.';
              if (text.contains('{')) {
                final jsonStr = text.substring(text.indexOf('{'));
                final parsed = jsonDecode(jsonStr);
                final loc = parsed['location'] ?? '';
                final title = parsed['title'] ?? 'ආපදා අනතුරු ඇඟවීමක්';
                final dist = parsed['distanceKm'] ?? '';
                alertDetails = '$loc ප්‍රදේශයේ $title! (දුර: කි.මී. $dist)';
              }

              if (await FlutterForegroundTask.isRunningService) {
                await FlutterForegroundTask.updateService(
                  notificationTitle: '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!',
                  notificationText: alertDetails,
                );
              } else {
                await FlutterForegroundTask.startService(
                  serviceId: 256,
                  notificationTitle: '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!',
                  notificationText: alertDetails,
                  callback: startSosCallback,
                );
              }
              // 🔥 WAKE UP PHONE DISPLAY & LAUNCH FULLSCREEN OVER LOCKSCREEN
              FlutterForegroundTask.wakeUpScreen();
              FlutterForegroundTask.launchApp();
            } catch (e) {
              debugPrint('Native red alert wake-up notice: $e');
            }
          }
        },
      );

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      AndroidWebViewController.enableDebugging(false);
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (_) async => const GeolocationPermissionsResponse(allow: true, retain: true),
      );
      androidController.setOnPlatformPermissionRequest((request) => request.grant());
    }

    _controller = controller;
  }

  // 5. Native GPS Location Retrieval and Injection to Web Layer
  Future<void> _fetchAndInjectCurrentLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        return;
      }
      if (!await Geolocator.isLocationServiceEnabled()) return;

      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 6),
      );
      _controller.runJavaScript("""
        if (window.onGpsLocationUpdated) {
          window.onGpsLocationUpdated(${pos.latitude}, ${pos.longitude}, ${pos.accuracy});
        }
      """);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const LinearProgressIndicator(
                backgroundColor: Colors.transparent,
                color: Color(0xFF007A4B),
                minHeight: 3,
              ),
          ],
        ),
      ),
    );
  }
}

