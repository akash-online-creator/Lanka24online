import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

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
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    debugPrint('Sahaya Sewa Foreground Service stopped (timeout: $isTimeout)');
  }

  @override
  void onReceiveData(Object data) {
    debugPrint('Foreground Service received message: $data');
  }

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
  WebViewController? _webViewController;
  bool _isLoading = true;
  StreamSubscription<Position>? _positionSubscription;
  double? _lastLat;
  double? _lastLng;

  // Mandatory Permission States
  bool _isCheckingPermissions = true;
  bool _hasRequiredPermissions = false;
  bool _isLocationGranted = false;
  bool _isNotificationGranted = false;
  bool _isGpsHardwareEnabled = true;
  bool _isPermanentlyDenied = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initWebview(); // Pre-warm and connect Webview instantly on app startup
    _checkCurrentPermissions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _positionSubscription?.cancel();
    FlutterForegroundTask.removeTaskDataCallback(_onReceiveTaskData);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_hasRequiredPermissions) {
      _checkCurrentPermissions();
    }
  }

  Future<void> _checkCurrentPermissions() async {
    try {
      final locStatus = await Permission.location.status;
      final notifStatus = await Permission.notification.status;
      final gpsEnabled = await Geolocator.isLocationServiceEnabled();

      final locGranted = locStatus.isGranted || locStatus.isLimited;
      final notifGranted = notifStatus.isGranted;
      final permanentlyDenied = locStatus.isPermanentlyDenied || notifStatus.isPermanentlyDenied;

      final allGranted = locGranted && notifGranted && gpsEnabled;

      if (mounted) {
        setState(() {
          _isLocationGranted = locGranted;
          _isNotificationGranted = notifGranted;
          _isGpsHardwareEnabled = gpsEnabled;
          _isPermanentlyDenied = permanentlyDenied;
          _hasRequiredPermissions = allGranted;
          _isCheckingPermissions = false;
        });

        if (allGranted) {
          if (_webViewController == null) {
            _initializeActiveApp();
          } else {
            _initForegroundTask();
            _startSilentBackgroundRadar();
          }
        }
      }
    } catch (e) {
      debugPrint('Permission verification notice: $e');
      if (mounted) {
        setState(() => _isCheckingPermissions = false);
      }
    }
  }

  Future<void> _requestMandatoryPermissions() async {
    // 1. If device GPS toggle is turned off, guide to device location settings
    final gpsEnabled = await Geolocator.isLocationServiceEnabled();
    if (!gpsEnabled) {
      await Geolocator.openLocationSettings();
      return;
    }

    // 2. Request Location Permission
    final locStatus = await Permission.location.request();
    if (locStatus.isGranted) {
      try {
        await Permission.locationAlways.request();
      } catch (_) {}
    }

    // 3. Request Notification Permission
    await Permission.notification.request();

    // 4. Request Battery Optimization Exemption for 24/7 radar
    try {
      if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
    } catch (_) {}

    await _checkCurrentPermissions();
  }

  void _initializeActiveApp() {
    _initWebview();
    _initForegroundTask();
    _startSilentBackgroundRadar();
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

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_24x7_radar',
        channelName: 'සහය සේවා 24/7 ආරක්ෂක සේවය',
        channelDescription: 'හදිසි ආපදා, රතු එළිය අනතුරු ඇඟවීම් සහ ළඟම පිහිටි සේවාවන් පැය 24 පුරා අධීක්ෂණය කරයි.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(15000), // Poll every 15 seconds
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );

    FlutterForegroundTask.addTaskDataCallback(_onReceiveTaskData);
  }

  void _initWebview() async {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF07130C))
      ..addJavaScriptChannel(
        'SahayaGpsChannel',
        onMessageReceived: (JavaScriptMessage message) async {
          if (message.message == 'GET_GPS' || message.message == 'FORCE_REFRESH') {
            try {
              Position pos = await Geolocator.getCurrentPosition(
                desiredAccuracy: LocationAccuracy.high,
                timeLimit: const Duration(seconds: 10),
              );
              _injectLocationIntoWebView(pos.latitude, pos.longitude, pos.accuracy);
            } catch (e) {
              debugPrint('Manual GPS refresh error: $e');
            }
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (NavigationRequest request) async {
            final String url = request.url;
            final Uri? uri = Uri.tryParse(url);
            
            if (uri == null) return NavigationDecision.navigate;

            // Handle WhatsApp, Telephone, SMS, Mail, and Intent links externally
            if (uri.scheme == 'whatsapp' ||
                uri.scheme == 'tel' ||
                uri.scheme == 'sms' ||
                uri.scheme == 'mailto' ||
                uri.scheme == 'intent' ||
                uri.host.contains('wa.me') ||
                uri.host.contains('api.whatsapp.com') ||
                uri.host.contains('whatsapp.com')) {
              try {
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                } else {
                  await launchUrl(uri, mode: LaunchMode.externalNonBrowserApplication);
                }
              } catch (e) {
                debugPrint('Could not launch external URL: $url ($e)');
                if (uri.host.contains('wa.me') || uri.host.contains('whatsapp.com')) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              }
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
          onProgress: (int progress) {
            if (progress >= 35 && _isLoading) {
              if (mounted) setState(() => _isLoading = false);
            }
          },
          onPageStarted: (String url) {
            // Dismiss loader quickly (max 1.2s safety timer) so the user never waits
            Future.delayed(const Duration(milliseconds: 1200), () {
              if (mounted && _isLoading) {
                setState(() => _isLoading = false);
              }
            });
          },
          onPageFinished: (String url) {
            if (mounted && _isLoading) setState(() => _isLoading = false);
            if (_lastLat != null && _lastLng != null) {
              _injectLocationIntoWebView(_lastLat!, _lastLng!, 10.0);
            }
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('WebView Error: ${error.description}');
            if (error.isForMainFrame ?? true) {
              _webViewController?.loadFlutterAsset('assets/web/index.html');
            }
          },
        ),
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

    setState(() {
      _webViewController = controller;
    });

    try {
      await controller.loadRequest(Uri.parse('https://supporservice.online/'));
    } catch (e) {
      debugPrint('Primary online URL loading notice: $e');
      try {
        await controller.loadFlutterAsset('assets/web/index.html');
      } catch (err) {
        debugPrint('Fallback loading error: $err');
      }
    }
  }

  void _injectLocationIntoWebView(double lat, double lng, double accuracy) {
    _lastLat = lat;
    _lastLng = lng;
    if (_webViewController == null) return;
    try {
      _webViewController!.runJavaScript("""
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

  Future<void> _startSilentBackgroundRadar() async {
    try {
      if (!await FlutterForegroundTask.isRunningService) {
        await FlutterForegroundTask.startService(
          serviceId: 256,
          notificationTitle: '🚨 සහය සේවා 24/7 ආරක්ෂක සේවය සක්‍රීයයි',
          notificationText: 'ආපදා හා හදිසි අනතුරු ඇඟවීම් පසුබිමින් නිරීක්ෂණය වේ',
          callback: startCallback,
        );
      }

      try {
        Position initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );
        _injectLocationIntoWebView(initialPos.latitude, initialPos.longitude, initialPos.accuracy);
      } catch (e) {
        debugPrint('Initial silent GPS error: $e');
      }

      _positionSubscription = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
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
    if (_isCheckingPermissions) {
      return Scaffold(
        backgroundColor: const Color(0xFF07130C),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              CircularProgressIndicator(color: Color(0xFF007A4B)),
              SizedBox(height: 20),
              Text(
                'ආරක්ෂක අවසර පරීක්ෂා වෙමින් පවතී...',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    // MANDATORY PERMISSION GATE SCREEN
    if (!_hasRequiredPermissions) {
      return Scaffold(
        backgroundColor: const Color(0xFF07130C),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(flex: 1),
                
                // Shield / Logo Icon
                Center(
                  child: Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      gradient: const RadialGradient(
                        colors: [Color(0xFF007A4B), Color(0xFF032616)],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF007A4B).withOpacity(0.4),
                          blurRadius: 24,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.security_rounded,
                      size: 46,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Title
                const Text(
                  'සහය සේවා - Sahaya Sewa',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Color(0xFF00A86B),
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'ආරක්ෂක අවසර ලබාදීම අනිවාර්යයි',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'හදිසි ආපදා අනතුරු ඇඟවීම් (Red Alerts) සහ ආසන්නතම හදිසි සේවාවන් ඔබ වෙත නිවැරදිව ලබා දීමට පහත අවසර සක්‍රීය කිරීම අනිවාර්ය වේ.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 32),

                // Card 1: GPS Location Permission
                _buildPermissionCard(
                  icon: Icons.location_on_rounded,
                  title: 'GPS ස්ථානගත කිරීම (Location)',
                  desc: 'ඔබ සිටින ස්ථානයට අදාළ හදිසි ආපදා කලාප හඳුනා ගැනීමට සහ ආසන්නතම සේවා සෙවීමට.',
                  isGranted: _isLocationGranted && _isGpsHardwareEnabled,
                ),
                const SizedBox(height: 14),

                // Card 2: Notifications Permission
                _buildPermissionCard(
                  icon: Icons.notifications_active_rounded,
                  title: 'ක්ෂණික අනතුරු ඇඟවීම් (Notifications)',
                  desc: 'අවට ආපදාවකදී හෝ හදිසි අවස්ථාවකදී සයිරන් සහ ආරක්ෂක දැනුම්දීම් ලැබීමට.',
                  isGranted: _isNotificationGranted,
                ),

                const Spacer(flex: 2),

                // Action Button
                if (!_isGpsHardwareEnabled)
                  ElevatedButton.icon(
                    onPressed: () async => await Geolocator.openLocationSettings(),
                    icon: const Icon(Icons.gps_fixed, color: Colors.white),
                    label: const Text(
                      'දුරකථනයේ GPS (Location) On කරන්න',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.amber[800],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                    ),
                  )
                else if (_isPermanentlyDenied)
                  ElevatedButton.icon(
                    onPressed: () async => await openAppSettings(),
                    icon: const Icon(Icons.settings, color: Colors.white),
                    label: const Text(
                      'Settings වෙත ගොස් අවසර සක්‍රීය කරන්න',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF007A4B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                    ),
                  )
                else
                  ElevatedButton.icon(
                    onPressed: _requestMandatoryPermissions,
                    icon: const Icon(Icons.verified_user_rounded, color: Colors.white),
                    label: const Text(
                      'අවසර ලබා දී ඉදිරියට යන්න',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF007A4B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                    ),
                  ),

                const SizedBox(height: 16),
                const Center(
                  child: Text(
                    '🔒 ඔබගේ පුද්ගලික තොරතුරු සහ ස්ථානය ආරක්ෂිතව තබා ගැනේ.',
                    style: TextStyle(color: Colors.white38, fontSize: 11),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      );
    }

    // MAIN APP WEBVIEW
    return WithForegroundTask(
      child: Scaffold(
        backgroundColor: const Color(0xFF07130C),
        body: SafeArea(
          child: Stack(
            children: [
              if (_webViewController != null)
                WebViewWidget(controller: _webViewController!),
              IgnorePointer(
                ignoring: !_isLoading,
                child: AnimatedOpacity(
                  opacity: _isLoading ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 300),
                  child: Container(
                    color: const Color(0xFF07130C),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 76,
                            height: 76,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF007A4B).withOpacity(0.35),
                                  blurRadius: 20,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: Image.asset(
                                'assets/web/logo.jpg',
                                width: 76,
                                height: 76,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  Icons.shield_rounded,
                                  size: 44,
                                  color: Color(0xFF00E676),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          const Text(
                            'සහය සේවා',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'ප්‍රජා සේවා හා ආපදා ආරක්ෂක පද්ධතිය',
                            style: TextStyle(color: Colors.white54, fontSize: 12),
                          ),
                          const SizedBox(height: 22),
                          const SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Color(0xFF00E676),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionCard({
    required IconData icon,
    required String title,
    required String desc,
    required bool isGranted,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF102619),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isGranted ? const Color(0xFF00A86B).withOpacity(0.6) : Colors.white12,
          width: 1.2,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isGranted ? const Color(0xFF007A4B).withOpacity(0.25) : Colors.white10,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isGranted ? const Color(0xFF00E676) : Colors.white70,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isGranted
                            ? const Color(0xFF00E676).withOpacity(0.15)
                            : Colors.amber.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isGranted ? '✓ සක්‍රීයයි' : 'අනිවාර්යයි',
                        style: TextStyle(
                          color: isGranted ? const Color(0xFF00E676) : Colors.amber[300],
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  desc,
                  style: const TextStyle(
                    color: Colors.white60,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

