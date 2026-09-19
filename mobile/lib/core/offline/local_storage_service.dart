import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../features/trip/domain/entities/trip.dart';

/// Platform-safe local persistence service for PWA, Web, and Native targets.
class LocalStorageService {
  static const String _keyActiveTrip = 'routeiq_active_trip';
  static const String _keyTelemetryQueue = 'routeiq_telemetry_queue';
  static const String _keyUserSession = 'routeiq_user_session';
  static const String _keyUserRole = 'routeiq_user_role';

  // --- Active Trip Management ---

  static Future<void> saveActiveTrip(TripEntity trip) async {
    final prefs = await SharedPreferences.getInstance();
    final data = {
      'id': trip.id,
      'driver_id': trip.driverId,
      'vehicle_id': trip.vehicleId,
      'status': trip.status,
      'start_time': trip.startTime?.toIso8601String(),
      'end_time': trip.endTime?.toIso8601String(),
      'vector_clock_client': trip.vectorClockClient,
      'vector_clock_server': trip.vectorClockServer,
      'nodes': trip.nodes.map((n) => {
        'id': n.id,
        'trip_id': n.tripId,
        'sequence_index': n.sequenceIndex,
        'node_status': n.nodeStatus,
        'address': n.address,
        'latitude': n.latitude,
        'longitude': n.longitude,
        'eta': n.eta?.toIso8601String(),
        'actual_arrival': n.actualArrival?.toIso8601String(),
        'actual_departure': n.actualDeparture?.toIso8601String(),
      }).toList(),
    };
    await prefs.setString(_keyActiveTrip, jsonEncode(data));
  }

  static Future<TripEntity?> getActiveTrip() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyActiveTrip);
    if (jsonStr == null || jsonStr.isEmpty) {
      return _getDemoTrip();
    }
    try {
      final Map<String, dynamic> map = jsonDecode(jsonStr);
      final rawNodes = (map['nodes'] as List<dynamic>?) ?? [];
      final nodes = rawNodes.map((n) => TripNodeEntity(
        id: n['id'] ?? '',
        tripId: n['trip_id'] ?? '',
        sequenceIndex: n['sequence_index'] ?? 0,
        nodeStatus: n['node_status'] ?? 'pending',
        address: n['address'] ?? '',
        latitude: (n['latitude'] as num).toDouble(),
        longitude: (n['longitude'] as num).toDouble(),
        eta: n['eta'] != null ? DateTime.tryParse(n['eta']) : null,
        actualArrival: n['actual_arrival'] != null ? DateTime.tryParse(n['actual_arrival']) : null,
        actualDeparture: n['actual_departure'] != null ? DateTime.tryParse(n['actual_departure']) : null,
      )).toList();

      return TripEntity(
        id: map['id'] ?? 'TRP-101',
        driverId: map['driver_id'] ?? 'DRV-99',
        vehicleId: map['vehicle_id'] ?? 'FLT-LAG-402',
        status: map['status'] ?? 'in_progress',
        startTime: map['start_time'] != null ? DateTime.tryParse(map['start_time']) : null,
        endTime: map['end_time'] != null ? DateTime.tryParse(map['end_time']) : null,
        vectorClockClient: map['vector_clock_client'] ?? 0,
        vectorClockServer: map['vector_clock_server'] ?? 0,
        nodes: nodes,
      );
    } catch (_) {
      return _getDemoTrip();
    }
  }

  static TripEntity _getDemoTrip() {
    return TripEntity(
      id: "TRP-8842",
      driverId: "DRV-104",
      vehicleId: "FLT-LAG-904",
      status: "in_progress",
      startTime: DateTime.now().subtract(const Duration(hours: 1)),
      vectorClockClient: 1,
      vectorClockServer: 1,
      nodes: [
        TripNodeEntity(
          id: "N-1",
          tripId: "TRP-8842",
          sequenceIndex: 0,
          nodeStatus: "delivered",
          address: "Ikeja Distribution Hub, Lagos",
          latitude: 6.5958,
          longitude: 3.3444,
          actualArrival: DateTime.now().subtract(const Duration(minutes: 45)),
          actualDeparture: DateTime.now().subtract(const Duration(minutes: 30)),
        ),
        TripNodeEntity(
          id: "N-2",
          tripId: "TRP-8842",
          sequenceIndex: 1,
          nodeStatus: "arrived",
          address: "14 Broad Street, Marina, Lagos Island",
          latitude: 6.4531,
          longitude: 3.3958,
          actualArrival: DateTime.now().subtract(const Duration(minutes: 5)),
        ),
        TripNodeEntity(
          id: "N-3",
          tripId: "TRP-8842",
          sequenceIndex: 2,
          nodeStatus: "pending",
          address: "Admiralty Way, Lekki Phase 1, Lagos",
          latitude: 6.4474,
          longitude: 3.4731,
        ),
        TripNodeEntity(
          id: "N-4",
          tripId: "TRP-8842",
          sequenceIndex: 3,
          nodeStatus: "pending",
          address: "Chevron Drive, Lekki Peninsula, Lagos",
          latitude: 6.4389,
          longitude: 3.5412,
        ),
      ],
    );
  }

  // --- User Session & Role ---

  static Future<void> saveUserSession({
    required String email,
    required String token,
    required String role, // 'manager' or 'driver'
    String? name,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserSession, token);
    await prefs.setString('user_email', email);
    await prefs.setString(_keyUserRole, role);
    if (name != null) {
      await prefs.setString('user_name', name);
    }
  }

  static Future<String> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyUserRole) ?? 'driver';
  }

  static Future<String?> getUserEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('user_email');
  }

  static Future<bool> hasSession() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_keyUserSession) || prefs.containsKey('access_token');
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUserSession);
    await prefs.remove('access_token');
    await prefs.remove('user_email');
    await prefs.remove(_keyUserRole);
  }

  // --- Telemetry Queue ---

  static Future<void> queueTelemetryPoint(Map<String, dynamic> point) async {
    final prefs = await SharedPreferences.getInstance();
    final queueJson = prefs.getStringList(_keyTelemetryQueue) ?? [];
    queueJson.add(jsonEncode(point));
    if (queueJson.length > 500) {
      queueJson.removeAt(0); // Bound memory queue size
    }
    await prefs.setStringList(_keyTelemetryQueue, queueJson);
  }

  static Future<List<Map<String, dynamic>>> getPendingTelemetry() async {
    final prefs = await SharedPreferences.getInstance();
    final queueJson = prefs.getStringList(_keyTelemetryQueue) ?? [];
    return queueJson.map((e) => jsonDecode(e) as Map<String, dynamic>).toList();
  }

  static Future<void> clearPendingTelemetry() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyTelemetryQueue);
  }
}
