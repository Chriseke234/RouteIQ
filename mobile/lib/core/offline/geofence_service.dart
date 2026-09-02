import 'dart:math' as math;
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../../features/trip/domain/entities/trip.dart';

class GeofenceService {
  /// Checks if the driver is within the geofence radius (default 100 meters) of the given node.
  static bool isInsideGeofence(double currentLat, double currentLng, TripNodeEntity node, {double radiusMeters = 100.0}) {
    final distance = Geolocator.distanceBetween(
      currentLat,
      currentLng,
      node.latitude,
      node.longitude,
    );
    return distance <= radiusMeters;
  }

  /// Computes the distance from the current location to the nearest point on the planned route polyline.
  /// If the distance is greater than the threshold (default 250 meters), the driver is considered deviated.
  static bool isDeviatedFromRoute(double currentLat, double currentLng, List<LatLng> routePoints, {double thresholdMeters = 250.0}) {
    if (routePoints.length < 2) return false;

    double minDistance = double.infinity;

    for (int i = 0; i < routePoints.length - 1; i++) {
      final a = routePoints[i];
      final b = routePoints[i + 1];

      final distance = _distanceToSegment(
        currentLat,
        currentLng,
        a.latitude,
        a.longitude,
        b.latitude,
        b.longitude,
      );

      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance > thresholdMeters;
  }

  /// Helper to calculate the geodesic distance from a point to a line segment AB.
  static double _distanceToSegment(
    double pLat,
    double pLng,
    double aLat,
    double aLng,
    double bLat,
    double bLng,
  ) {
    // Flat-Earth projection projection factor calculation
    final double latAvgRad = ((aLat + bLat + pLat) / 3.0) * math.pi / 180.0;
    final double scaleX = math.cos(latAvgRad);

    final double dx = (bLng - aLng) * scaleX;
    final double dy = bLat - aLat;

    final double wx = (pLng - aLng) * scaleX;
    final double wy = pLat - aLat;

    final double denominator = dx * dx + dy * dy;
    
    // If the segment is a single point, return distance to that point
    if (denominator == 0) {
      return Geolocator.distanceBetween(pLat, pLng, aLat, aLng);
    }

    double t = (wx * dx + wy * dy) / denominator;
    t = math.max(0.0, math.min(1.0, t)); // Clamp projection to the segment

    final double closestLat = aLat + t * (bLat - aLat);
    final double closestLng = aLng + t * (bLng - aLng);

    return Geolocator.distanceBetween(pLat, pLng, closestLat, closestLng);
  }
}
