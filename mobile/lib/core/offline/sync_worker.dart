import 'dart:async';
import 'local_storage_service.dart';
import '../network/http_client.dart';

/// Cross-platform sync worker supporting both Web PWA and Native.
class SyncScheduler {
  static Timer? _periodicTimer;

  static Future<void> initialize() async {}

  static Future<void> scheduleTelemetrySync() async {
    _periodicTimer?.cancel();
    _periodicTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      await runTelemetrySync();
    });
  }

  static Future<bool> runTelemetrySync() async {
    try {
      final queue = await LocalStorageService.getPendingTelemetry();
      if (queue.isEmpty) return true;

      final network = NetworkClient();
      final response = await network.post(
        "/api/v1/telemetry/batch",
        data: {"records": queue},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        await LocalStorageService.clearPendingTelemetry();
        return true;
      }
    } catch (_) {
      // Offline fallback
    }
    return false;
  }
}
