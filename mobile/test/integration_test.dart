import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../lib/core/offline/local_storage_service.dart';
import '../lib/features/trip/domain/entities/trip.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('RouteIQ PWA Offline Storage and Trip Entity Pipeline Test', () async {
    // 1. Verify initial state loads demo trip
    final initialTrip = await LocalStorageService.getActiveTrip();
    expect(initialTrip, isNotNull);
    expect(initialTrip!.nodes.length, equals(4));

    // 2. Queue simulated telemetry points
    const uuid = Uuid();
    for (int i = 0; i < 50; i++) {
      await LocalStorageService.queueTelemetryPoint({
        "record_id": uuid.v4(),
        "latitude": 6.5244 + (i * 0.0001),
        "longitude": 3.3792 + (i * 0.0001),
        "speed_kph": 50.0,
        "heading_degrees": 90.0,
        "battery_level": 0.95,
        "timestamp_utc": DateTime.now().toUtc().toIso8601String(),
      });
    }

    // 3. Verify queue retention
    final queue = await LocalStorageService.getPendingTelemetry();
    expect(queue.length, equals(50));

    // 4. Update trip node status
    final updatedNodes = initialTrip.nodes.map((node) {
      if (node.id == "N-2") {
        return node.copyWith(nodeStatus: "delivered");
      }
      return node;
    }).toList();

    final modifiedTrip = initialTrip.copyWith(
      nodes: updatedNodes,
      vectorClockClient: initialTrip.vectorClockClient + 1,
    );

    await LocalStorageService.saveActiveTrip(modifiedTrip);

    final reloadedTrip = await LocalStorageService.getActiveTrip();
    expect(reloadedTrip!.vectorClockClient, equals(2));
    expect(reloadedTrip.nodes.firstWhere((n) => n.id == "N-2").nodeStatus, equals("delivered"));

    // 5. Clear queue after sync
    await LocalStorageService.clearPendingTelemetry();
    final emptyQueue = await LocalStorageService.getPendingTelemetry();
    expect(emptyQueue.isEmpty, isTrue);
  });
}
