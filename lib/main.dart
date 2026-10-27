import 'dart:convert';
// File: lib/main.dart (24/7 Background Push Notifications, High-Precision GPS & Emergency Siren Architecture)
// Delivers Telegram / SMS-style notifications for:
// 1. 🚨 රතු එළිය (Red Alert)
// 2. ⚡ ක්ෂණික සේවා (Quick Services)
// 3. 👥 කණ්ඩායම් පණිවිඩ (Group Messages)
// 4. 💬 Chat පණිවිඩ (Direct & Service Chat Messages)
// even when the app is completely closed or screen is locked.
// ------------------------------------------------------------------------------------------

import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show MethodChannel, rootBundle;
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const String kFirestoreProjectId = 'gen-lang-client-0262698872';
const String kFirestoreDatabaseId = 'ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f';
const String kFirebaseApiKey = 'AIzaSyBtTtuWnl4-orEHh9JkPHtkE5_z794EhpQ';

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
// 🚨 2. 24/7 BACKGROUND PUSH & SOS TASK (Runs Even When App Is Closed)
// ==============================================================
@pragma('vm:entry-point')
void startSosCallback() {
  FlutterForegroundTask.setTaskHandler(SahayaSosTaskHandler());
}

class SahayaSosTaskHandler extends TaskHandler {
  int _lastSeenPushMs = DateTime.now().millisecondsSinceEpoch - 5000;
  final Set<String> _deliveredIds = <String>{};
  bool _isSosTracking = false;

  String _normalizePhone(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length >= 9 ? digits.substring(digits.length - 9) : digits;
  }

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('🚨 Sahaya Sewa 24/7 Background Push & Emergency Radar Started');
    final savedMs = await FlutterForegroundTask.getData<int>(key: 'lastSeenPushMs');
    if (savedMs != null && savedMs > 0) {
      _lastSeenPushMs = savedMs;
    } else {
      _lastSeenPushMs = DateTime.now().millisecondsSinceEpoch - 5000;
    }
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    // 1. Poll Firestore push_broadcast_queue for Red Alert, Quick Service, Group Messages & Chat Messages
    await _pollFirestorePushBroadcastQueue();

    // 2. If SOS Live Tracking is active, broadcast high-accuracy GPS to main isolate
    if (_isSosTracking) {
      try {
        Position pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 4),
        );
        FlutterForegroundTask.sendDataToMain({
          'type': 'GPS',
          'lat': pos.latitude,
          'lng': pos.longitude,
          'accuracy': pos.accuracy,
        });
      } catch (e) {
        debugPrint('SOS GPS location scan notice: $e');
      }
    }
  }

  Future<void> _pollFirestorePushBroadcastQueue() async {
    HttpClient? client;
    try {
      final String currentUserId = (await FlutterForegroundTask.getData<String>(key: 'userId')) ?? '';
      final String currentUserPhone = _normalizePhone(await FlutterForegroundTask.getData<String>(key: 'userPhone'));

      client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 4);

      final uri = Uri.parse(
        'https://firestore.googleapis.com/v1/projects/$kFirestoreProjectId/databases/$kFirestoreDatabaseId/documents:runQuery?key=$kFirebaseApiKey',
      );

      final request = await client.postUrl(uri);
      request.headers.set(HttpHeaders.contentTypeHeader, 'application/json; charset=utf-8');

      final queryPayload = {
        'structuredQuery': {
          'from': [
            {'collectionId': 'push_broadcast_queue'}
          ],
          'where': {
            'fieldFilter': {
              'field': {'fieldPath': 'createdAtMs'},
              'op': 'GREATER_THAN',
              'value': {'integerValue': _lastSeenPushMs.toString()}
            }
          },
          'limit': 15
        }
      };

      request.add(utf8.encode(jsonEncode(queryPayload)));
      final response = await request.close().timeout(const Duration(seconds: 4));

      if (response.statusCode != 200) return;

      final responseBody = await response.transform(utf8.decoder).join();
      final List<dynamic> results = jsonDecode(responseBody);

      for (final item in results) {
        if (item is! Map<String, dynamic>) continue;
        final doc = item['document'];
        if (doc is! Map<String, dynamic>) continue;
        final fields = doc['fields'];
        if (fields is! Map<String, dynamic>) continue;

        String getStr(String key) {
          final f = fields[key];
          if (f is Map<String, dynamic> && f['stringValue'] != null) {
            return f['stringValue'].toString();
          }
          return '';
        }

        int getInt(String key) {
          final f = fields[key];
          if (f is Map<String, dynamic>) {
            if (f['integerValue'] != null) {
              return int.tryParse(f['integerValue'].toString()) ?? 0;
            }
            if (f['doubleValue'] != null) {
              return (double.tryParse(f['doubleValue'].toString()) ?? 0).toInt();
            }
          }
          return 0;
        }

        final String docName = doc['name']?.toString() ?? '';
        final String pushId = getStr('id').isNotEmpty ? getStr('id') : docName.split('/').last;
        final int createdAtMs = getInt('createdAtMs');

        if (createdAtMs > _lastSeenPushMs) {
          _lastSeenPushMs = createdAtMs;
          await FlutterForegroundTask.saveData(key: 'lastSeenPushMs', value: _lastSeenPushMs);
        }

        if (pushId.isEmpty || _deliveredIds.contains(pushId)) continue;
        _deliveredIds.add(pushId);
        if (_deliveredIds.length > 200) {
          _deliveredIds.remove(_deliveredIds.first);
        }

        final String senderId = getStr('senderId');
        final String senderPhone = _normalizePhone(getStr('senderPhone'));

        // Skip self-sent notifications
        if (currentUserId.isNotEmpty && senderId.isNotEmpty && currentUserId == senderId) {
          continue;
        }
        if (currentUserPhone.isNotEmpty && senderPhone.isNotEmpty && currentUserPhone == senderPhone) {
          continue;
        }

        // Check recipient filter if targeted to a specific user (1-on-1 Chat / Post Owner)
        final String recipientId = getStr('recipientId');
        final String recipientPhone = _normalizePhone(getStr('recipientPhone'));
        if (recipientId.isNotEmpty || recipientPhone.isNotEmpty) {
          final bool idMatch = currentUserId.isNotEmpty &&
              recipientId.isNotEmpty &&
              currentUserId.toLowerCase() == recipientId.toLowerCase();
          final bool phoneMatch = currentUserPhone.isNotEmpty &&
              recipientPhone.isNotEmpty &&
              currentUserPhone == recipientPhone;
          if (!idMatch && !phoneMatch) {
            continue;
          }
        }

        final String category = getStr('category').isNotEmpty ? getStr('category') : 'admin_broadcast';
        final String rawTitle = getStr('title').isNotEmpty ? getStr('title') : 'සහය සේවා දැනුම්දීම';
        final String rawBody = getStr('body').isNotEmpty ? getStr('body') : getStr('message');
        final String locationName = getStr('locationName');

        String formattedTitle = rawTitle;
        if (category == 'red_alert' && !rawTitle.contains('🚨')) {
          formattedTitle = '🚨 රතු එළිය: $rawTitle';
        } else if (category == 'quick_service' && !rawTitle.contains('⚡')) {
          formattedTitle = '⚡ ක්ෂණික සේවා: $rawTitle';
        } else if ((category == 'group_work' || category == 'group_message') && !rawTitle.contains('👥')) {
          formattedTitle = '👥 කණ්ඩායම් පණිවිඩ: $rawTitle';
        } else if (category == 'chat_message' && !rawTitle.contains('💬')) {
          formattedTitle = '💬 $rawTitle';
        }

        final String formattedBody = locationName.isNotEmpty ? '$rawBody • 📍 $locationName' : rawBody;

        // Update Foreground Notification & Wake Screen
        await FlutterForegroundTask.updateService(
          notificationTitle: formattedTitle,
          notificationText: formattedBody,
        );
        FlutterForegroundTask.wakeUpScreen();

        // Send to main isolate to trigger native stacking notification & audio
        FlutterForegroundTask.sendDataToMain({
          'type': 'PUSH_ALERT',
          'id': pushId,
          'category': category,
          'title': formattedTitle,
          'body': formattedBody,
          'alertId': getStr('alertId'),
          'postId': getStr('postId'),
          'groupId': getStr('groupId'),
        });

        if (category == 'red_alert') {
          FlutterForegroundTask.launchApp();
        }
      }
    } catch (_) {
      // Ignore transient network errors
    } finally {
      client?.close(force: true);
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {}

  @override
  void onReceiveData(Object data) {
    if (data is Map) {
      if (data['cmd'] == 'START_SOS') {
        _isSosTracking = true;
      } else if (data['cmd'] == 'STOP_SOS') {
        _isSosTracking = false;
      }
    }
  }

  @override
  void onNotificationButtonPressed(String id) {
    FlutterForegroundTask.launchApp();
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
  FlutterForegroundTask.initCommunicationPort();
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
  static const MethodChannel _nativeNotifChannel = MethodChannel('com.sahayasewa.app/notifications');
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    FlutterForegroundTask.addTaskDataCallback(_onReceiveBackgroundTaskData);
    _initEmergencySirenChannel();
    _start24x7BackgroundAlertService();
    _requestAllInitialPermissions();
    _setupWebView();
    _startServerAndLoad();
  }

  void _onReceiveBackgroundTaskData(Object data) {
    if (data is Map) {
      if (data['type'] == 'PUSH_ALERT') {
        final String category = data['category']?.toString() ?? 'general';
        final String title = data['title']?.toString() ?? 'සහය සේවා';
        final String body = data['body']?.toString() ?? '';
        _dispatchNativeStackingNotification(category: category, title: title, body: body);
      }
    }
  }

  Future<void> _dispatchNativeStackingNotification({
    required String category,
    required String title,
    required String body,
  }) async {
    try {
      await _nativeNotifChannel.invokeMethod('showNotification', {
        'category': category,
        'title': title,
        'body': body,
      });
    } catch (_) {}
  }

  // 1. App Launch Initial Permissions Auto-Request
  Future<void> _requestAllInitialPermissions() async {
    try {
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }
      if (await Permission.location.isDenied) {
        await Permission.location.request();
      }
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
    } catch (e) {
      debugPrint('Initial permissions auto-request notice: $e');
    }
  }

  // 2. 24/7 Background Emergency & Chat Push Service
  Future<void> _start24x7BackgroundAlertService() async {
    try {
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
      if (!await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.startService(
          serviceId: 256,
          notificationTitle: 'සහය සේවා - 24/7 සජීවී පණිවිඩ හා ආපදා සේවාව 🛡️',
          notificationText: 'රතු එළිය, ක්ෂණික සේවා, කණ්ඩායම් සහ Chat පණිවිඩ පසුබිමෙන් ක්‍රියාත්මකයි.',
          callback: startSosCallback,
        );
      }
    } catch (e) {
      debugPrint('Background service setup notice: $e');
    }
  }

  @override
  void dispose() {
    FlutterForegroundTask.removeTaskDataCallback(_onReceiveBackgroundTaskData);
    WidgetsBinding.instance.removeObserver(this);
    _assetServer.stop();
    super.dispose();
  }

  // 3. High-Priority Emergency & Message Notification Channel Initialization
  void _initEmergencySirenChannel() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_emergency_red_alert',
        channelName: 'රතු එළිය, ක්ෂණික සේවා සහ Chat පණිවිඩ (24/7 Live)',
        channelDescription: 'ඇප් එක වසා තිබෙන විට පවා Telegram/SMS මෙන් හදිසි ආපදා, ක්ෂණික සේවා, කණ්ඩායම් සහ Chat පණිවිඩ ලබාදෙයි.',
        channelImportance: NotificationChannelImportance.MAX,
        priority: NotificationPriority.MAX,
        enableVibration: true,
        playSound: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(showNotification: true, playSound: true),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(4000),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
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
            FlutterForegroundTask.sendDataToTask({'cmd': 'START_SOS'});
            await FlutterForegroundTask.updateService(
              notificationTitle: 'සහය සේවා - සජීවී SOS පිහිටීම විකාශනය වේ 🚨',
              notificationText: 'ඔබගේ ආරක්ෂාව උදෙසා ගලවාගන්නන් වෙත සජීවී පිහිටීම යොමු කෙරේ.',
            );
          } else if (text == 'STOP_SOS_TRACKING') {
            FlutterForegroundTask.sendDataToTask({'cmd': 'STOP_SOS'});
          } else if (text.startsWith('SYNC_USER_SESSION:')) {
            try {
              final jsonStr = text.substring('SYNC_USER_SESSION:'.length);
              final parsed = jsonDecode(jsonStr);
              final String userId = parsed['userId']?.toString() ?? '';
              final String phone = parsed['phone']?.toString() ?? '';
              await FlutterForegroundTask.saveData(key: 'userId', value: userId);
              await FlutterForegroundTask.saveData(key: 'userPhone', value: phone);
              try {
                await _nativeNotifChannel.invokeMethod('syncUser', {
                  'userId': userId,
                  'phone': phone,
                });
              } catch (_) {}
            } catch (_) {}
          } else if (text.startsWith('TRIGGER_NATIVE_NOTIFICATION:')) {
            try {
              final jsonStr = text.substring('TRIGGER_NATIVE_NOTIFICATION:'.length);
              final parsed = jsonDecode(jsonStr);
              final String category = parsed['category']?.toString() ?? 'general';
              final String title = parsed['title']?.toString() ?? 'සහය සේවා පණිවිඩයක්';
              final String body = parsed['body']?.toString() ?? '';
              await _dispatchNativeStackingNotification(category: category, title: title, body: body);
            } catch (_) {}
          } else if (text.startsWith('TRIGGER_RED_ALERT')) {
            try {
              String alertDetails = 'හදිසි ආපදා අනතුරු ඇඟවීමක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න.';
              String alertTitle = '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!';
              if (text.contains('{')) {
                final jsonStr = text.substring(text.indexOf('{'));
                final parsed = jsonDecode(jsonStr);
                final loc = parsed['location'] ?? '';
                final title = parsed['title'] ?? 'ආපදා අනතුරු ඇඟවීමක්';
                final dist = parsed['distanceKm'] ?? '';
                alertTitle = '🚨 රතු එළිය: $title';
                alertDetails = loc.toString().isNotEmpty
                    ? '$loc ප්‍රදේශයේ $title! ${dist.toString().isNotEmpty ? "(දුර: කි.මී. $dist)" : ""}'
                    : (parsed['body']?.toString() ?? alertDetails);
              }

              await _dispatchNativeStackingNotification(
                category: 'red_alert',
                title: alertTitle,
                body: alertDetails,
              );

              if (await FlutterForegroundTask.isRunningService) {
                await FlutterForegroundTask.updateService(
                  notificationTitle: alertTitle,
                  notificationText: alertDetails,
                );
              } else {
                await FlutterForegroundTask.startService(
                  serviceId: 256,
                  notificationTitle: alertTitle,
                  notificationText: alertDetails,
                  callback: startSosCallback,
                );
              }
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
