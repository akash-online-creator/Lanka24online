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
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFDC2626),
          secondary: Color(0xFFF59E0B),
          surface: Color(0xFF0F172A),
        ),
        useMaterial3: true,
      ),
      home: const MandatoryPermissionGate(),
    );
  }
}

/// Mandatory Permission Gate: App will NEVER open unless all critical permissions are granted
class MandatoryPermissionGate extends StatefulWidget {
  const MandatoryPermissionGate({super.key});

  @override
  State<MandatoryPermissionGate> createState() => _MandatoryPermissionGateState();
}

class _MandatoryPermissionGateState extends State<MandatoryPermissionGate> with WidgetsBindingObserver {
  bool _isChecking = true;
  bool _notificationGranted = false;
  bool _locationGranted = false;
  bool _backgroundLocationGranted = false;
  bool _batteryOptimizationGranted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkAllPermissions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Re-check permissions when user returns from Android Settings
      _checkAllPermissions();
    }
  }

  Future<void> _checkAllPermissions() async {
    setState(() => _isChecking = true);

    try {
      final notif = await Permission.notification.isGranted;
      final loc = await Permission.location.isGranted || await Permission.locationWhenInUse.isGranted;
      final bgLoc = await Permission.locationAlways.isGranted;
      final battery = await Permission.ignoreBatteryOptimizations.isGranted;

      setState(() {
        _notificationGranted = notif;
        _locationGranted = loc;
        _backgroundLocationGranted = bgLoc;
        _batteryOptimizationGranted = battery;
        _isChecking = false;
      });

      // If all mandatory permissions are granted, start 24/7 background service
      if (notif && loc && (bgLoc || loc) && battery) {
        _initAndStartForegroundService();
      }
    } catch (e) {
      debugPrint('Permission verification error: $e');
      setState(() => _isChecking = false);
    }
  }

  Future<void> _requestAllPermissions() async {
    setState(() => _isChecking = true);

    try {
      // 1. Notification Permission
      await Permission.notification.request();

      // 2. Foreground Location
      await Permission.location.request();

      // 3. Background Location (Allow all the time)
      if (await Permission.location.isGranted) {
        await Permission.locationAlways.request();
      }

      // 4. Battery Optimization Exemption for 24/7 persistence
      await FlutterForegroundTask.requestIgnoreBatteryOptimization();

      // 5. Audio recording / alerts
      await Permission.microphone.request();

      await _checkAllPermissions();
    } catch (e) {
      debugPrint('Error requesting permissions: $e');
      setState(() => _isChecking = false);
    }
  }

  void _initAndStartForegroundService() {
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

    FlutterForegroundTask.startService(
      serviceId: 256,
      notificationTitle: '🚨 සහය සේවා 24/7 ආරක්ෂක සේවය සක්‍රීයයි',
      notificationText: 'ආපදා හා හදිසි අනතුරු ඇඟවීම් පසුබිමින් නිරීක්ෂණය වේ',
      callback: startCallback,
    );
  }

  bool get _isAllGranted =>
      _notificationGranted && _locationGranted && _batteryOptimizationGranted;

  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Color(0xFFDC2626)),
              SizedBox(height: 16),
              Text(
                'ආරක්ෂක අවසර පරීක්ෂා වෙමින් පවතී...',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    // If permissions are granted, navigate into the Main Web App screen
    if (_isAllGranted) {
      return const MainAppScreen();
    }

    // MANDATORY PERMISSION GATE SCREEN (App will not open without permissions)
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Icon & Title
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDC2626).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFDC2626).withOpacity(0.4), width: 2),
                  ),
                  child: const Icon(Icons.security, color: Color(0xFFEF4444), size: 36),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'අනිවාර්ය ආරක්ෂක අවසර\n(Mandatory Permissions)',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'ඇප් එක Close කළද පසුබිමින් 24/7 ක්‍රියාත්මක වීමට පහත අවසර සියල්ල අනිවාර්යයෙන්ම ලබා දිය යුතුය. අවසර ලබා නොදී ඇප් එක භාවිත කළ නොහැක.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 24),

              // Permissions Checklist Cards
              Expanded(
                child: ListView(
                  children: [
                    _buildPermissionItem(
                      icon: Icons.notifications_active,
                      title: '1. දැනුම්දීම් අවසරය (Notifications)',
                      desc: 'ඇප් එක Close කළද Foreground Service දැනුම්දීම පවත්වා ගැනීමට',
                      isGranted: _notificationGranted,
                    ),
                    const SizedBox(height: 12),
                    _buildPermissionItem(
                      icon: Icons.my_location,
                      title: '2. GPS ස්ථාන අවසරය (Location)',
                      desc: 'කිලෝමීටර් 5 සීමාවේ ආපදා හා අනතුරු හඳුනා ගැනීමට',
                      isGranted: _locationGranted,
                    ),
                    const SizedBox(height: 12),
                    _buildPermissionItem(
                      icon: Icons.location_on,
                      title: '3. පසුබිම් GPS (Background Location)',
                      desc: 'ඇප් එක වැසූ පසුත් "Allow all the time" තෝරා GPS ලබා ගැනීමට',
                      isGranted: _backgroundLocationGranted,
                    ),
                    const SizedBox(height: 12),
                    _buildPermissionItem(
                      icon: Icons.battery_charging_full,
                      title: '4. බැටරි ප්‍රශස්තිකරණ නිදහස් කිරීම',
                      desc: 'Android OS මගින් පසුබිම් ඇප් එක Kill / Stop කිරීම වැළැක්වීමට (Unrestricted)',
                      isGranted: _batteryOptimizationGranted,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Grant All Permissions Button
              ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
              ).let((style) => ElevatedButton(
                onPressed: _requestAllPermissions,
                style: style,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'සියලු අවසර ලබා දී ඇප් එක අරඹන්න',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              )),

              const SizedBox(height: 10),

              // Open Settings Button
              OutlinedButton(
                onPressed: () => openAppSettings(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Color(0xFF334155)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.settings, size: 18, color: Colors.white70),
                    SizedBox(width: 8),
                    Text(
                      'Settings වෙත ගොස් අවසර ලබා දෙන්න',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPermissionItem({
    required IconData icon,
    required String title,
    required String desc,
    required bool isGranted,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isGranted ? const Color(0xFF064E3B).withOpacity(0.3) : const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isGranted ? const Color(0xFF10B981) : const Color(0xFF1E293B),
          width: 1.5,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isGranted ? const Color(0xFF10B981).withOpacity(0.2) : const Color(0xFF334155).withOpacity(0.4),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: isGranted ? const Color(0xFF34D399) : Colors.white70, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: isGranted ? const Color(0xFF34D399) : Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  desc,
                  style: const TextStyle(color: Colors.white60, fontSize: 11, height: 1.4),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isGranted ? const Color(0xFF10B981).withOpacity(0.2) : const Color(0xFFEF4444).withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isGranted ? '✅ සක්‍රීයයි' : '❌ අක්‍රීයයි',
              style: TextStyle(
                color: isGranted ? const Color(0xFF34D399) : const Color(0xFFF87171),
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

extension LetExtension<T> on T {
  R let<R>(R Function(T it) op) => op(this);
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
    _initWebView();
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
      // Load offline bundled React Single Page Application from assets/web/index.html
      await _webViewController.loadFlutterAsset('assets/web/index.html');
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
