import 'dart:convert';
// File: lib/main.dart (24/7 Background Notification & Red Alert Screen-Waking Siren Engine)
// ------------------------------------------------------------------------------------------

import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
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
// 🚨 2. 24/7 BACKGROUND TASK HANDLER (Red Alerts, Quick Services, Blood, Relief)
// ==============================================================
@pragma('vm:entry-point')
void startSosCallback() {
  FlutterForegroundTask.setTaskHandler(SahayaSosTaskHandler());
}

class SahayaSosTaskHandler extends TaskHandler {
  final Set<String> seenAlertIds = <String>{};
  final Set<String> seenPostIds = <String>{};
  final Set<String> ignoredAlertIds = <String>{};
  String watchedUserId = '';
  double userLat = 7.151;
  double userLng = 79.885;
  bool isFirstPoll = true;

  static const List<String> baseUrls = [
    'https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/ai-studio-sahayaseva-08bfd3be-2f42-4de8-a3a8-ad7279ec7d1f/documents',
    'https://firestore.googleapis.com/v1/projects/gen-lang-client-0262698872/databases/(default)/documents',
    'https://firestore.googleapis.com/v1/projects/gen-lang-client-0536295842/databases/(default)/documents'
  ];

  double _calcDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371.0;
    final double dLat = (lat2 - lat1) * math.pi / 180.0;
    final double dLon = (lon2 - lon1) * math.pi / 180.0;
    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180.0) *
            math.cos(lat2 * math.pi / 180.0) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final double c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  String _getStr(Map fields, String key, [String fallback = '']) {
    final obj = fields[key];
    if (obj is Map) {
      if (obj['stringValue'] != null) return obj['stringValue'].toString();
      if (obj['integerValue'] != null) return obj['integerValue'].toString();
      if (obj['doubleValue'] != null) return obj['doubleValue'].toString();
    }
    return fallback;
  }

  double? _getNum(Map fields, String key) {
    final obj = fields[key];
    if (obj is Map) {
      if (obj['doubleValue'] != null) return double.tryParse(obj['doubleValue'].toString());
      if (obj['integerValue'] != null) return double.tryParse(obj['integerValue'].toString());
      if (obj['stringValue'] != null) return double.tryParse(obj['stringValue'].toString());
    }
    return null;
  }

  Future<List<Map>> _fetchCollectionDocs(String colName, int pageSize) async {
    final List<Map> results = [];
    for (final base in baseUrls) {
      try {
        final client = HttpClient();
        client.connectionTimeout = const Duration(seconds: 4);
        final req = await client.getUrl(Uri.parse('$base/$colName?pageSize=$pageSize'));
        final resp = await req.close().timeout(const Duration(seconds: 4));
        if (resp.statusCode == 200) {
          final body = await resp.transform(utf8.decoder).join();
          final parsed = jsonDecode(body);
          final docs = parsed['documents'];
          if (docs is List) {
            for (final d in docs) {
              if (d is Map) results.add(d);
            }
          }
        }
        client.close();
      } catch (_) {}
    }
    return results;
  }

  Future<void> pollFirestoreAllAlerts() async {
    final bool initialSeed = isFirstPoll;

    // 1. Poll Red Alerts (රතු එළිය - Wakes Screen + Plays Siren)
    final redDocs = await _fetchCollectionDocs('red_alerts', 15);
    for (final doc in redDocs) {
      final fields = doc['fields'];
      if (fields is! Map) continue;
      final status = _getStr(fields, 'status');
      if (status != 'active') continue;
      final fakeObj = fields['isFlaggedFake'];
      final isFake = fakeObj is Map ? (fakeObj['booleanValue'] == true) : false;
      if (isFake) continue;

      final nameStr = (doc['name'] ?? '').toString();
      final docId = _getStr(fields, 'id', nameStr.split('/').last);
      if (docId.isEmpty || seenAlertIds.contains(docId) || ignoredAlertIds.contains(docId)) continue;

      final repUid = _getStr(fields, 'reportedByUserId');
      if (watchedUserId.isNotEmpty && repUid.isNotEmpty && repUid == watchedUserId) {
        seenAlertIds.add(docId);
        continue;
      }

      final aLat = _getNum(fields, 'latitude') ?? _getNum(fields, 'lat') ?? 7.151;
      final aLng = _getNum(fields, 'longitude') ?? _getNum(fields, 'lng') ?? 79.885;
      final distKm = _calcDistanceKm(userLat, userLng, aLat, aLng);
      if (distKm > 15.0) continue;

      seenAlertIds.add(docId);

      final titleSi = _getStr(fields, 'disasterTitleSi', _getStr(fields, 'title', 'හදිසි ආපදා අනතුරු ඇඟවීමක්'));
      final locName = _getStr(fields, 'locationName', 'ශ්‍රී ලංකාව');
      final desc = _getStr(fields, 'description', 'වහාම ආරක්ෂිත පියවර ගන්න.');

      await FlutterForegroundTask.updateService(
        notificationTitle: '🚨 රතු එළිය: $titleSi',
        notificationText: '$locName (දුර: කි.මී. ${distKm.toStringAsFixed(1)}) - $desc',
      );
      FlutterForegroundTask.wakeUpScreen();
      FlutterForegroundTask.launchApp();
      FlutterForegroundTask.sendDataToMain({
        'type': 'NATIVE_BG_RED_ALERT',
        'alertId': docId,
        'title': titleSi,
        'locationName': locName,
        'distanceKm': distKm.toStringAsFixed(1),
        'description': desc,
      });
      break;
    }

    // 2. Poll Push Broadcast Queue (Quick Services, Blood Requests, Disaster Relief, Help Requests)
    final queueDocs = await _fetchCollectionDocs('push_broadcast_queue', 20);
    for (final doc in queueDocs) {
      final fields = doc['fields'];
      if (fields is! Map) continue;
      final nameStr = (doc['name'] ?? '').toString();
      final docId = nameStr.split('/').last;
      if (docId.isEmpty || seenPostIds.contains(docId)) continue;

      final senderId = _getStr(fields, 'senderId');
      if (watchedUserId.isNotEmpty && senderId.isNotEmpty && senderId == watchedUserId) {
        seenPostIds.add(docId);
        continue;
      }

      seenPostIds.add(docId);
      if (initialSeed) continue;

      final category = _getStr(fields, 'category', 'quick_service');
      final title = _getStr(fields, 'title', 'සහය සේවා දැනුම්දීමක්');
      final body = _getStr(fields, 'body', _getStr(fields, 'message', 'නව දැනුම්දීමක් ලැබී ඇත.'));
      final locName = _getStr(fields, 'locationName', 'ශ්‍රී ලංකාව');
      final alertId = _getStr(fields, 'alertId');
      final postId = _getStr(fields, 'postId', docId);
      final targetModal = _getStr(fields, 'targetModal', category);

      if (category == 'red_alert') {
        if (alertId.isNotEmpty && (seenAlertIds.contains(alertId) || ignoredAlertIds.contains(alertId))) continue;
        if (alertId.isNotEmpty) seenAlertIds.add(alertId);
        await FlutterForegroundTask.updateService(
          notificationTitle: title.startsWith('🚨') ? title : '🚨 $title',
          notificationText: body,
        );
        FlutterForegroundTask.wakeUpScreen();
        FlutterForegroundTask.launchApp();
        FlutterForegroundTask.sendDataToMain({
          'type': 'NATIVE_BG_RED_ALERT',
          'alertId': alertId.isNotEmpty ? alertId : docId,
          'title': title,
          'locationName': locName,
          'description': body,
        });
      } else {
        await FlutterForegroundTask.updateService(
          notificationTitle: title,
          notificationText: body,
        );
        FlutterForegroundTask.sendDataToMain({
          'type': 'NATIVE_BG_SERVICE_NOTIFICATION',
          'category': category,
          'postId': postId,
          'title': title,
          'body': body,
          'locationName': locName,
          'targetModal': targetModal,
        });
      }
    }

    // 3. Poll Blood Requests (ලේ ඉල්ලීම්)
    final bloodDocs = await _fetchCollectionDocs('blood_requests', 15);
    for (final doc in bloodDocs) {
      final fields = doc['fields'];
      if (fields is! Map) continue;
      final nameStr = (doc['name'] ?? '').toString();
      final docId = _getStr(fields, 'id', nameStr.split('/').last);
      if (docId.isEmpty || seenPostIds.contains(docId)) continue;
      seenPostIds.add(docId);
      if (initialSeed) continue;

      final authorId = _getStr(fields, 'userId');
      if (watchedUserId.isNotEmpty && authorId.isNotEmpty && authorId == watchedUserId) continue;

      final bloodGroup = _getStr(fields, 'bloodGroup', '');
      final hospital = _getStr(fields, 'hospitalName', '');
      final patient = _getStr(fields, 'patientName', '');
      final units = _getStr(fields, 'unitsNeeded', '1');
      final district = _getStr(fields, 'district', 'ශ්‍රී ලංකාව');

      final title = '🩸 හදිසි $bloodGroup ලේ ඉල්ලීමක්!';
      final body = '$hospital ($district) - $patient වෙනුවෙන් $bloodGroup ලේ ඒකක $unitsක් හදිසියේ අවශ්‍යයි.';

      await FlutterForegroundTask.updateService(
        notificationTitle: title,
        notificationText: body,
      );
      FlutterForegroundTask.sendDataToMain({
        'type': 'NATIVE_BG_SERVICE_NOTIFICATION',
        'category': 'emergency_blood',
        'postId': docId,
        'title': title,
        'body': body,
        'locationName': '$hospital, $district',
        'targetModal': 'blood',
      });
    }

    // 4. Poll Disaster Relief Requests (සහන සේවා ඉල්ලීම්)
    final reliefDocs = await _fetchCollectionDocs('disaster_relief', 15);
    for (final doc in reliefDocs) {
      final fields = doc['fields'];
      if (fields is! Map) continue;
      final nameStr = (doc['name'] ?? '').toString();
      final docId = _getStr(fields, 'id', nameStr.split('/').last);
      if (docId.isEmpty || seenPostIds.contains(docId)) continue;
      seenPostIds.add(docId);
      if (initialSeed) continue;

      final authorId = _getStr(fields, 'userId');
      if (watchedUserId.isNotEmpty && authorId.isNotEmpty && authorId == watchedUserId) continue;

      final rTitle = _getStr(fields, 'title', 'සහන සේවා ඉල්ලීමක්');
      final rLoc = _getStr(fields, 'locationName', '');
      final rDist = _getStr(fields, 'district', 'ශ්‍රී ලංකාව');
      final rDesc = _getStr(fields, 'description', 'ආපදා සහනාධාර ද්‍රව්‍ය කඩිනමින් අවශ්‍යයි.');

      final title = '📦 සහන සේවා ඉල්ලීමක්: $rTitle';
      final body = '$rLoc ($rDist) - $rDesc';

      await FlutterForegroundTask.updateService(
        notificationTitle: title,
        notificationText: body,
      );
      FlutterForegroundTask.sendDataToMain({
        'type': 'NATIVE_BG_SERVICE_NOTIFICATION',
        'category': 'aid_ledger',
        'postId': docId,
        'title': title,
        'body': body,
        'locationName': '$rLoc, $rDist',
        'targetModal': 'aid_ledger',
      });
    }

    // 5. Poll Help Posts (ඉක්මන් සේවා සහ සහන සේවා ඉල්ලීම්)
    final postDocs = await _fetchCollectionDocs('posts', 20);
    for (final doc in postDocs) {
      final fields = doc['fields'];
      if (fields is! Map) continue;
      final nameStr = (doc['name'] ?? '').toString();
      final docId = _getStr(fields, 'id', nameStr.split('/').last);
      if (docId.isEmpty || seenPostIds.contains(docId)) continue;
      seenPostIds.add(docId);
      if (initialSeed) continue;

      final isDelObj = fields['isDeleted'];
      if (isDelObj is Map && isDelObj['booleanValue'] == true) continue;

      final authorId = _getStr(fields, 'userId', _getStr(fields, 'authorId'));
      if (watchedUserId.isNotEmpty && authorId.isNotEmpty && authorId == watchedUserId) continue;

      final pCat = _getStr(fields, 'category', 'quick_services');
      final pType = _getStr(fields, 'postType', '');
      final headline = _getStr(fields, 'headline', _getStr(fields, 'title', _getStr(fields, 'whatHappened', 'නව සේවා ඉල්ලීමක්')));
      final needed = _getStr(fields, 'whatIsNeeded', _getStr(fields, 'content', headline));
      final loc = _getStr(fields, 'locationName', 'ශ්‍රී ලංකාව');

      final isQuick = pCat == 'quick_services' || pType == 'quick_service';
      final title = isQuick ? '⚡ ඉක්මන් සේවා: $headline' : '🤝 සහන සේවා ඉල්ලීමක්: $headline';
      final body = '📍 $loc • $needed';

      await FlutterForegroundTask.updateService(
        notificationTitle: title,
        notificationText: body,
      );
      FlutterForegroundTask.sendDataToMain({
        'type': 'NATIVE_BG_SERVICE_NOTIFICATION',
        'category': isQuick ? 'quick_service' : 'help_request',
        'postId': docId,
        'title': title,
        'body': body,
        'locationName': loc,
        'targetModal': isQuick ? 'quick_service' : 'detail',
      });
    }

    isFirstPoll = false;
  }

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    debugPrint('🚨 Sahaya Sewa 24/7 Background Alert Service Started');
    await pollFirestoreAllAlerts();
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    try {
      await pollFirestoreAllAlerts();
      Position pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      userLat = pos.latitude;
      userLng = pos.longitude;
      FlutterForegroundTask.sendDataToMain({
        'lat': pos.latitude,
        'lng': pos.longitude,
        'accuracy': pos.accuracy,
      });
    } catch (e) {
      debugPrint('Background scan notice: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {}

  @override
  void onReceiveData(Object data) {
    if (data is Map) {
      if (data['userId'] != null) {
        watchedUserId = data['userId'].toString();
      }
      if (data['lat'] is num) userLat = (data['lat'] as num).toDouble();
      if (data['lng'] is num) userLng = (data['lng'] as num).toDouble();
      final ignored = data['ignoredAlertIds'];
      if (ignored is List) {
        for (final id in ignored) {
          if (id != null) ignoredAlertIds.add(id.toString());
        }
      }
    }
  }

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

// ⚡ NATIVE SCREEN WAKER & SIREN CHANNEL (Wakes up display over lockscreen & plays Siren on Red Alert)
const MethodChannel _screenWakerChannel = MethodChannel('com.sahayasewa.app/screen_waker');

Future<void> _invokeNativeScreenWaker({
  String? title,
  String? body,
  bool playSiren = true,
}) async {
  try {
    await _screenWakerChannel.invokeMethod('wakeUpScreen', {
      'title': title ?? '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!',
      'body': body ?? 'ඔබගේ ප්‍රදේශය අවට හදිසි ආපදාවක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න.',
      'playSiren': playSiren,
    });
  } catch (e) {
    debugPrint('Native screen waker invoke notice: $e');
  }
}

Future<void> _invokeStopNativeSiren() async {
  try {
    await _screenWakerChannel.invokeMethod('stopSiren');
  } catch (e) {
    debugPrint('Native stop siren notice: $e');
  }
}

Future<void> _invokeNativeBackgroundNotification({
  required String title,
  required String body,
  int? notifId,
}) async {
  try {
    await _screenWakerChannel.invokeMethod('showBackgroundNotification', {
      'title': title,
      'body': body,
      'notifId': notifId ?? (DateTime.now().millisecondsSinceEpoch % 100000),
    });
  } catch (e) {
    debugPrint('Native background notification notice: $e');
  }
}

class SahayaSewaApp extends StatelessWidget {
  const SahayaSewaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '1+ සහය සේවා',
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
    FlutterForegroundTask.addTaskDataCallback(_onReceiveTaskData);
    _initEmergencySirenChannel();
    _setupWebView();
    _startServerAndLoad();
    _requestAllInitialPermissions();
  }

  void _onReceiveTaskData(Object data) {
    if (data is Map) {
      if (data['type'] == 'NATIVE_BG_RED_ALERT') {
        final String title = (data['title'] ?? '🚨 රතු එළිය - හදිසි ආපදාවක්!').toString();
        final String loc = (data['locationName'] ?? 'ශ්‍රී ලංකාව').toString();
        final String desc = (data['description'] ?? 'වහාම පරීක්ෂා කරන්න.').toString();
        _invokeNativeScreenWaker(
          title: '🚨 රතු එළිය: $title',
          body: '📍 $loc - $desc',
          playSiren: true,
        );
        final payloadJson = jsonEncode(data);
        _controller.runJavaScript("""
          window.dispatchEvent(new CustomEvent('sahaya_red_alert_received', { detail: $payloadJson }));
        """);
      } else if (data['type'] == 'NATIVE_BG_SERVICE_NOTIFICATION') {
        final String title = (data['title'] ?? 'සහය සේවා දැනුම්දීමක්').toString();
        final String body = (data['body'] ?? '').toString();
        _invokeNativeBackgroundNotification(title: title, body: body);
        final payloadJson = jsonEncode(data);
        _controller.runJavaScript("""
          window.dispatchEvent(new CustomEvent('sahaya_native_bg_notification', { detail: $payloadJson }));
        """);
      }
    }
  }

  Future<void> _requestAllInitialPermissions() async {
    try {
      if (await Permission.notification.isDenied) {
        await Permission.notification.request();
      }
      if (await Permission.location.isDenied) {
        await Permission.location.request();
      }
      await _start24x7BackgroundAlertService();
    } catch (e) {
      debugPrint('Initial permissions auto-request notice: $e');
    }
  }

  Future<void> _start24x7BackgroundAlertService() async {
    try {
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
      if (!await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.startService(
          serviceId: 256,
          notificationTitle: 'සහය සේවා 24/7 ආරක්ෂණ පද්ධතිය සක්‍රියයි',
          notificationText: 'රතු එළිය, ඉක්මන් සේවා, ලේ ඉල්ලීම් සහ සහන සේවා දැනුම්දීම් ක්‍රියාත්මකයි',
          callback: startSosCallback,
        );
      }
    } catch (e) {
      debugPrint('Background service setup notice: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _assetServer.stop();
    super.dispose();
  }

  void _initEmergencySirenChannel() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_emergency_red_alert',
        channelName: 'රතු එළිය හදිසි ආපදා සයිරන් (Red Alert)',
        channelDescription: '24/7 සහය සේවා ආරක්ෂණ පද්ධතිය පූර්ණ වශයෙන් සක්‍රියව පවතී',
        channelImportance: NotificationChannelImportance.MAX,
        priority: NotificationPriority.MAX,
        enableVibration: true,
        playSound: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(showNotification: true, playSound: true),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(4000),
        autoRunOnBoot: true,
        allowWifiLock: true,
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
            await FlutterForegroundTask.startService(
              serviceId: 256,
              notificationTitle: 'සහාය සේවා - සජීවී SOS පිහිටීම විකාශනය වේ 🚨',
              notificationText: 'ඔබගේ ආරක්ෂාව උදෙසා ගලවාගන්නන් වෙත සජීවී පිහිටීම යොමු කෙරේ.',
              callback: startSosCallback,
            );
          } else if (text == 'STOP_SOS_TRACKING') {
            await _invokeStopNativeSiren();
          } else if (text == 'STOP_RED_ALERT' || text == 'STOP_SIREN') {
            await _invokeStopNativeSiren();
            if (await FlutterForegroundTask.isRunningService) {
              await FlutterForegroundTask.updateService(
                notificationTitle: 'සහය සේවා 24/7 ආරක්ෂණ පද්ධතිය සක්‍රියයි',
                notificationText: 'රතු එළිය, ඉක්මන් සේවා, ලේ ඉල්ලීම් සහ සහන සේවා දැනුම්දීම් ක්‍රියාත්මකයි',
              );
            }
          } else if (text.startsWith('TRIGGER_RED_ALERT') || text.startsWith('WAKE_SCREEN_AND_SHOW_NOTIFICATION')) {
            try {
              String alertTitle = '🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!';
              String alertDetails = 'හදිසි ආපදා අනතුරු ඇඟවීමක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න.';
              bool playSiren = true;
              if (text.contains('{')) {
                final jsonStr = text.substring(text.indexOf('{'));
                final parsed = jsonDecode(jsonStr);
                final loc = parsed['location'] ?? parsed['locationName'] ?? 'ශ්‍රී ලංකාව';
                final title = parsed['title'] ?? 'ආපදා අනතුරු ඇඟවීමක්';
                final dist = parsed['distanceKm'] ?? '';
                final desc = parsed['description'] ?? '';
                alertTitle = title.toString().startsWith('🚨') ? title.toString() : '🚨 $title';
                alertDetails = '📍 $loc${dist.toString().isNotEmpty ? " (දුර: කි.මී. $dist)" : ""} - $desc';
                if (parsed['playSiren'] == false) playSiren = false;
              }

              await _invokeNativeScreenWaker(
                title: alertTitle,
                body: alertDetails,
                playSiren: playSiren,
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
          } else if (text.startsWith('SHOW_BACKGROUND_NOTIFICATION:')) {
            try {
              final jsonStr = text.substring('SHOW_BACKGROUND_NOTIFICATION:'.length);
              final parsed = jsonDecode(jsonStr);
              final String title = (parsed['title'] ?? 'සහය සේවා දැනුම්දීමක්').toString();
              final String body = (parsed['body'] ?? '').toString();
              final String loc = (parsed['locationName'] ?? '').toString();
              final String fullBody = loc.isNotEmpty && !body.contains(loc) ? '📍 $loc • $body' : body;
              await _invokeNativeBackgroundNotification(title: title, body: fullBody);
            } catch (e) {
              debugPrint('Native background notification error: $e');
            }
          } else if (text.startsWith('SYNC_WATCHER_CONFIG:')) {
            try {
              final jsonStr = text.substring('SYNC_WATCHER_CONFIG:'.length);
              final parsed = jsonDecode(jsonStr);
              FlutterForegroundTask.sendDataToTask(parsed);
            } catch (e) {
              debugPrint('Error syncing watcher config: $e');
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
