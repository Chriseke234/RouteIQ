import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:uuid/uuid.dart';

import '../../domain/entities/trip.dart';
import '../../domain/repositories/trip_repository.dart';
import '../../data/repositories/trip_repository_impl.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../../core/network/http_client.dart';
import '../../../../core/offline/geofence_service.dart';

// Providers definitions
final networkClientProvider = Provider<NetworkClient>((ref) {
  return NetworkClient();
});

final tripRepositoryProvider = Provider<TripRepository>((ref) {
  return TripRepositoryImpl(
    networkClient: ref.watch(networkClientProvider),
  );
});

// State representations
class TripState {
  final bool isLoading;
  final TripEntity? trip;
  final String? errorMessage;
  final bool isOffline;
  final bool hasConflict;
  final LatLng? currentPosition;
  final bool isDeviated;
  final bool hasArrivedAtNode;

  const TripState({
    this.isLoading = false,
    this.trip,
    this.errorMessage,
    this.isOffline = false,
    this.hasConflict = false,
    this.currentPosition,
    this.isDeviated = false,
    this.hasArrivedAtNode = false,
  });

  TripState copyWith({
    bool? isLoading,
    TripEntity? trip,
    String? errorMessage,
    bool? isOffline,
    bool? hasConflict,
    LatLng? currentPosition,
    bool? isDeviated,
    bool? hasArrivedAtNode,
  }) {
    return TripState(
      isLoading: isLoading ?? this.isLoading,
      trip: trip ?? this.trip,
      errorMessage: errorMessage ?? this.errorMessage,
      isOffline: isOffline ?? this.isOffline,
      hasConflict: hasConflict ?? this.hasConflict,
      currentPosition: currentPosition ?? this.currentPosition,
      isDeviated: isDeviated ?? this.isDeviated,
      hasArrivedAtNode: hasArrivedAtNode ?? this.hasArrivedAtNode,
    );
  }
}

// State notifier
class TripNotifier extends StateNotifier<TripState> {
  final TripRepository repository;
  StreamSubscription<Position>? _positionSubscription;

  TripNotifier(this.repository) : super(const TripState());

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }

  /// Starts listening to real-time GPS coordinates and runs geofence + deviation checks
  void startLocationTracking() {
    _positionSubscription?.cancel();
    
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 5,
      ),
    ).listen((Position position) async {
      final currentLatLng = LatLng(position.latitude, position.longitude);

      await _logTelemetryLocally(position);

      if (state.trip == null) {
        state = state.copyWith(currentPosition: currentLatLng);
        return;
      }

      final trip = state.trip!;

      TripNodeEntity? activeNode;
      try {
        activeNode = trip.nodes.firstWhere((n) => n.nodeStatus == 'pending');
      } catch (_) {
        activeNode = null;
      }

      bool insideGeofence = false;
      if (activeNode != null) {
        insideGeofence = GeofenceService.isInsideGeofence(
          position.latitude,
          position.longitude,
          activeNode,
        );
        
        if (insideGeofence && activeNode.nodeStatus == 'pending') {
          await updateNodeStatus(activeNode.id, 'arrived');
        }
      }

      final routePoints = trip.nodes.map((n) => LatLng(n.latitude, n.longitude)).toList();
      final isDeviated = GeofenceService.isDeviatedFromRoute(
        position.latitude,
        position.longitude,
        routePoints,
      );

      state = state.copyWith(
        currentPosition: currentLatLng,
        isDeviated: isDeviated,
        hasArrivedAtNode: insideGeofence,
      );
    });
  }

  Future<void> _logTelemetryLocally(Position position) async {
    try {
      const uuid = Uuid();
      final record = {
        "record_id": uuid.v4(),
        "trip_id": state.trip?.id,
        "latitude": position.latitude,
        "longitude": position.longitude,
        "speed_kph": position.speed,
        "heading_degrees": position.heading,
        "battery_level": 1.0,
        "timestamp_utc": DateTime.now().toUtc().toIso8601String(),
      };
      await LocalStorageService.queueTelemetryPoint(record);
    } catch (_) {}
  }

  Future<void> fetchActiveTrip() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final activeTrip = await repository.getActiveTrip();
      if (activeTrip != null) {
        state = state.copyWith(isLoading: false, trip: activeTrip, isOffline: false);
      } else {
        state = state.copyWith(isLoading: false, errorMessage: "No active trip found.");
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: "Running in offline fallback mode.");
    }
  }

  Future<void> updateTripStatus(String newStatus) async {
    if (state.trip == null) return;
    
    final currentTrip = state.trip!;
    final updatedTrip = currentTrip.copyWith(status: newStatus);

    await repository.updateTripStatusOffline(updatedTrip);
    state = state.copyWith(trip: updatedTrip);

    try {
      await repository.syncTripUpdates(updatedTrip);
      state = state.copyWith(isOffline: false, hasConflict: false);
    } catch (_) {
      state = state.copyWith(isOffline: true);
    }
  }

  Future<void> updateNodeStatus(String nodeId, String nodeStatus) async {
    if (state.trip == null) return;

    final trip = state.trip!;
    final updatedNodes = trip.nodes.map((node) {
      if (node.id == nodeId) {
        final now = DateTime.now();
        return node.copyWith(
          nodeStatus: nodeStatus,
          actualArrival: nodeStatus == 'arrived' ? now : node.actualArrival,
          actualDeparture: (nodeStatus == 'delivered' || nodeStatus == 'skipped') ? now : node.actualDeparture,
        );
      }
      return node;
    }).toList();

    final updatedTrip = trip.copyWith(
      nodes: updatedNodes,
      vectorClockClient: trip.vectorClockClient + 1,
    );

    await repository.updateTripStatusOffline(updatedTrip);
    state = state.copyWith(trip: updatedTrip);

    try {
      await repository.syncTripUpdates(updatedTrip);
      state = state.copyWith(isOffline: false, hasConflict: false);
    } catch (_) {
      state = state.copyWith(isOffline: true);
    }
  }
}

final tripNotifierProvider = StateNotifierProvider<TripNotifier, TripState>((ref) {
  return TripNotifier(
    ref.watch(tripRepositoryProvider),
  );
});
