import 'dart:math' as math;
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:plugin_platform_interface/plugin_platform_interface.dart';

import '../lib/core/offline/geofence_service.dart';
import '../lib/features/trip/domain/entities/trip.dart';

class MockGeolocatorPlatform extends PlatformInterface
    implements GeolocatorPlatform {
  MockGeolocatorPlatform() : super(token: const Object());

  @override
  double distanceBetween(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    // Planar approximation for distance calculation inside tests (Lagos, Nigeria area)
    final double latAvgRad = ((startLatitude + endLatitude) / 2.0) * math.pi / 180.0;
    final double scaleX = math.cos(latAvgRad);

    final double dx = (endLongitude - startLongitude) * 111320.0 * scaleX;
    final double dy = (endLatitude - startLatitude) * 110574.0;
    return math.sqrt(dx * dx + dy * dy);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  setUp(() {
    GeolocatorPlatform.instance = MockGeolocatorPlatform();
  });

  group('GeofenceService Tests', () {
    const testNode = TripNodeEntity(
      id: "node-1",
      tripId: "trip-1",
      sequenceIndex: 0,
      nodeStatus: "pending",
      address: "45 Warehouse Road, Apapa, Lagos",
      latitude: 6.4429,
      longitude: 3.3614,
    );

    test('isInsideGeofence returns true when within 100 meters', () {
      // 50 meters away from 6.4429, 3.3614 (approx 0.00045 degrees lat)
      final inside = GeofenceService.isInsideGeofence(
        6.4429 + 0.0004,
        3.3614,
        testNode,
      );
      expect(inside, isTrue);
    });

    test('isInsideGeofence returns false when further than 100 meters', () {
      // 200 meters away (approx 0.0018 degrees lat)
      final inside = GeofenceService.isInsideGeofence(
        6.4429 + 0.0018,
        3.3614,
        testNode,
      );
      expect(inside, isFalse);
    });

    test('isDeviatedFromRoute returns false when close to segment path', () {
      final List<LatLng> route = [
        const LatLng(6.4429, 3.3614),
        const LatLng(6.4500, 3.3700),
      ];

      // A point close to the route segment
      final deviated = GeofenceService.isDeviatedFromRoute(
        6.4465, // Midway lat
        3.3657, // Midway lng
        route,
        thresholdMeters: 250.0,
      );
      expect(deviated, isFalse);
    });

    test('isDeviatedFromRoute returns true when far from segment path', () {
      final List<LatLng> route = [
        const LatLng(6.4429, 3.3614),
        const LatLng(6.4500, 3.3700),
      ];

      // A point 500 meters off the route segment
      final deviated = GeofenceService.isDeviatedFromRoute(
        6.4429 + 0.005, // Deviated lat
        3.3614,
        route,
        thresholdMeters: 250.0,
      );
      expect(deviated, isTrue);
    });
  });
}
