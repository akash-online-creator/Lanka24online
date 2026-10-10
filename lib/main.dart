import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle, MethodChannel;
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

// ==============================================================
// 🌐 LOCAL EMBEDDED SERVER FOR NATIVE SELF-CONTAINED APK RUNTIME
// ==============================================================
class LocalAssetServer {
  HttpServer? _server;
  int get port => _server?.port ?? 0;

  Future<int> start() async {
    try {
      _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      _server!.listen((HttpRequest request) async {
        try {
          String path = request.uri.path;

          // CORS Preflight handling
          if (request.method == 'OPTIONS') {
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
            request.response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            request.response.statusCode = HttpStatus.ok;
            await request.response.close();
            return;
          }

          // Handle API requests when backend is on remote server
          if (path.startsWith('/api/')) {
            request.response.headers.contentType = ContentType.parse('application/json; charset=utf-8');
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.statusCode = HttpStatus.notFound;
            request.response.write('{"error": "API route not hosted locally on device", "fallback": true}');
            await request.response.close();
            return;
          }

          if (path == '/' || path.isEmpty) {
            path = '/index.html';
          }

          final assetPath = 'assets/web${path}';
          
          try {
            final ByteData data = await rootBundle.load(assetPath);
            final List<int> bytes = data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes);

            String mimeType = 'text/html; charset=utf-8';
            if (path.endsWith('.js')) mimeType = 'application/javascript; charset=utf-8';
            else if (path.endsWith('.css')) mimeType = 'text/css; charset=utf-8';
            else if (path.endsWith('.json')) mimeType = 'application/json; charset=utf-8';
            else if (path.endsWith('.png')) mimeType = 'image/png';
            else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (path.endsWith('.svg')) mimeType = 'image/svg+xml';
            else if (path.endsWith('.woff2')) mimeType = 'font/woff2';

            request.response.headers.contentType = ContentType.parse(mimeType);
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.add(bytes);
            await request.response.close();
          } catch (e) {
            // SPA Fallback to index.html for unknown client routes
            final ByteData fallbackData = await rootBundle.load('assets/web/index.html');
            final List<int> bytes = fallbackData.buffer.asUint8List(fallbackData.offsetInBytes, fallbackData.lengthInBytes);
            request.response.headers.contentType = ContentType.parse('text/html; charset=utf-8');
            request.response.headers.add('Access-Control-Allow-Origin', '*');
            request.response.add(bytes);
            await request.response.close();
          }
        } catch (err) {
          request.response.statusCode = HttpStatus.internalServerError;
          await request.response.close();
        }
      });
      return _server!.port;
    } catch (e) {
      debugPrint('LocalAssetServer start error: $e');
      return 0;
    }
  }

  void stop() {
    _server?.close(force: true);
  }
}

// ==============================================================
// 🚨 24/7 BACKGROUND RADAR TASK HANDLER (PERSISTENT EXECUTION)
// ==============================================================
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(SahayaForegroundTaskHandler());
}

class SahayaForegroundTaskHandler extends TaskHandler {
  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('🚨 24/7 Sahaya Sewa Silent Radar Service Started in Background');
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    try {
      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      FlutterForegroundTask.sendDataToMain({
        'lat': pos.latitude,
        'lng': pos.longitude,
        'accuracy': pos.accuracy,
      });
    } catch (e) {
      debugPrint('24/7 Background GPS scan notice: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {}

  @override
  void onReceiveData(Object data) {}

  @override
  void onNotificationButtonPressed(String id) {
    if (id == 'open_app') {
      FlutterForegroundTask.launchApp();
    }
  }

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

class _MainAppScreenState extends State<MainAppScreen> with WidgetsBindingObserver {
  final LocalAssetServer _assetServer = LocalAssetServer();
  late final WebViewController _controller;
  bool _isLoading = true;
  double _loadProgress = 0.0;
  
  double? _lastLat;
  double? _lastLng;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _setupWebView();
    _loadAppContent();
    _requestAndStartBackgroundServices();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _assetServer.stop();
    FlutterForegroundTask.removeTaskDataCallback(_onReceiveTaskData);
    super.dispose();
  }
  Future<void> _loadAppContent() async {
    try {
      final String htmlContent = await rootBundle.loadString('assets/web/index.html');
      await _controller.loadHtmlString(htmlContent, baseUrl: 'https://supporservice.online');
    } catch (e) {
      debugPrint('loadHtmlString notice: $e, trying LocalAssetServer...');
      try {
        final port = await _assetServer.start();
        if (mounted && port > 0) {
          await _controller.loadRequest(Uri.parse('http://127.0.0.1:$port/'));
        } else {
          await _controller.loadFlutterAsset('assets/web/index.html');
        }
      } catch (err) {
        try {
          await _controller.loadFlutterAsset('assets/web/index.html');
        } catch (_) {}
      }
    }
  }

  void _setupWebView() {
    final WebViewController controller = WebViewController();

    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F172A))
      ..setUserAgent('Mozilla/5.0 (Linux; Android 13; Mobile App SahayaSewa) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36')
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (mounted) {
              setState(() {
                _loadProgress = progress / 100.0;
                if (progress >= 25) {
                  _isLoading = false;
                }
              });
            }
          },
          onPageStarted: (String url) {
            if (mounted) {
              setState(() => _isLoading = true);
            }
            Future.delayed(const Duration(milliseconds: 1500), () {
              if (mounted && _isLoading) {
                setState(() => _isLoading = false);
              }
            });
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() => _isLoading = false);
            }
            if (_lastLat != null && _lastLng != null) {
              _injectLocationIntoWebView(_lastLat!, _lastLng!, 10.0);
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('Local WebView Resource Notice: ${error.errorCode} - ${error.description}');
          },
          onNavigationRequest: (NavigationRequest request) async {
            final url = request.url;
            if (url.startsWith('whatsapp:') ||
                url.startsWith('tel:') ||
                url.startsWith('mailto:') ||
                url.startsWith('intent:') ||
                url.contains('wa.me') ||
                url.contains('api.whatsapp.com')) {
              try {
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              } catch (e) {
                debugPrint('External URL launch error: $e');
              }
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
          debugPrint('🚨 [SahayaNativeAlertChannel] Event received: ${message.message}');
          if (message.message == 'PLAY_SIREN' || message.message.startsWith('TRIGGER_RED_ALERT')) {
            _triggerEmergencySirenNotification(message.message);
          }
        },
      );

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      AndroidWebViewController.enableDebugging(false);
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (request) async {
          return const GeolocationPermissionsResponse(allow: true, retain: true);
        },
      );
      androidController.setOnPlatformPermissionRequest((request) {
        request.grant();
      });
    }

    _controller = controller;
  }

  void _triggerEmergencySirenNotification(String payload) {
    try {
      FlutterForegroundTask.updateService(
        notificationTitle: '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීම!',
        notificationText: 'ඔබගේ කලාපයේ හදිසි ආපදාවක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න!',
      );
    } catch (e) {
      debugPrint('Siren update error: $e');
    }
  }

  Future<void> _requestAndStartBackgroundServices() async {
    try {
      // 1. Location Permissions (Foreground & Background "Always Allow")
      final locStatus = await Permission.location.request();
      if (locStatus.isGranted) {
        try {
          await Permission.locationAlways.request();
        } catch (_) {}
      }

      // 2. Notification Permissions (Android 13+)
      await Permission.notification.request();

      // 3. System Alert Window (Display over other apps for emergency popup)
      try {
        if (!await Permission.systemAlertWindow.isGranted) {
          await Permission.systemAlertWindow.request();
        }
      } catch (_) {}

      // 4. Exact Alarm Permission (for zero-latency siren triggering)
      try {
        if (!await Permission.scheduleExactAlarm.isGranted) {
          await Permission.scheduleExactAlarm.request();
        }
      } catch (_) {}

      // 5. Unrestricted Battery / Ignore Battery Optimization
      try {
        if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
          await FlutterForegroundTask.requestIgnoreBatteryOptimization();
        }
      } catch (_) {}

      FlutterForegroundTask.addTaskDataCallback(_onReceiveTaskData);
      _initForegroundService();
      _startBackgroundForegroundTask();

      _fetchAndInjectCurrentLocation();
    } catch (e) {
      debugPrint('Background service setup notice: $e');
    }
  }

  Future<void> _fetchAndInjectCurrentLocation() async {
    try {
      bool gpsEnabled = await Geolocator.isLocationServiceEnabled();
      if (!gpsEnabled) return;

      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      _injectLocationIntoWebView(pos.latitude, pos.longitude, pos.accuracy);
    } catch (e) {
      debugPrint('Location fetch notice: $e');
    }
  }

  void _injectLocationIntoWebView(double lat, double lng, double accuracy) {
    _lastLat = lat;
    _lastLng = lng;
    try {
      _controller.runJavaScript("""
        (function() {
          if (window.onGpsLocationUpdated) {
            window.onGpsLocationUpdated($lat, $lng, $accuracy);
          }
          if (window.sahayaNativeLocation) {
            window.sahayaNativeLocation = { lat: $lat, lng: $lng, accuracy: $accuracy };
          }
        })();
      """);
    } catch (e) {
      debugPrint('Location injection notice: $e');
    }
  }

  void _onReceiveTaskData(Object data) {
    if (data is Map) {
      final lat = (data['lat'] as num?)?.toDouble();
      final lng = (data['lng'] as num?)?.toDouble();
      final acc = (data['accuracy'] as num?)?.toDouble() ?? 10.0;
      if (lat != null && lng != null) {
        _injectLocationIntoWebView(lat, lng, acc);
      }
    }
  }

  void _initForegroundService() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_emergency_red_alert',
        channelName: 'රතු එළිය හදිසි ආපදා සයිරන් (Red Alert)',
        channelDescription: 'හදිසි ආපදා, රතු එළිය අනතුරු ඇඟවීම් සහ ජීවිතාරක්ෂක පණිවුඩ සයිරන් නාදය සමඟින් පැය 24 පුරා අධීක්ෂණය කරයි.',
        channelImportance: NotificationChannelImportance.MAX,
        priority: NotificationPriority.MAX,
        enableVibration: true,
        playSound: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: true,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(15000),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  Future<void> _startBackgroundForegroundTask() async {
    try {
      if (await FlutterForegroundTask.isRunningService) {
        return;
      }
      await FlutterForegroundTask.startService(
        serviceId: 256,
        notificationTitle: 'සහය සේවා 24/7 සක්‍රීයයි 🚨',
        notificationText: 'ඔබගේ ආරක්ෂාව උදෙසා සජීවී ආපදා සහ හදිසි පණිවුඩ අධීක්ෂණය වේ.',
        callback: startCallback,
      );
    } catch (e) {
      debugPrint('Foreground service start notice: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Stack(
          children: [
            // Main Native App WebView
            WebViewWidget(controller: _controller),

            // Top progress bar while loading
            if (_isLoading)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: LinearProgressIndicator(
                  value: _loadProgress > 0 ? _loadProgress : null,
                  backgroundColor: Colors.transparent,
                  color: const Color(0xFF007A4B),
                  minHeight: 3,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
