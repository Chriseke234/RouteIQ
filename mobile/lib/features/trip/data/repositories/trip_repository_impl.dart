import '../../domain/entities/trip.dart';
import '../../domain/repositories/trip_repository.dart';
import '../models/trip_model.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../../core/network/http_client.dart';

class TripRepositoryImpl implements TripRepository {
  final NetworkClient networkClient;

  TripRepositoryImpl({
    required this.networkClient,
  });

  @override
  Future<TripEntity?> getActiveTrip() async {
    try {
      final response = await networkClient.get("/api/v1/trips/active");
      if (response.statusCode == 200 && response.data != null) {
        final tripModel = TripModel.fromJson(response.data);
        await LocalStorageService.saveActiveTrip(tripModel);
        return tripModel;
      }
    } catch (_) {
      // Offline fallback
    }
    return await LocalStorageService.getActiveTrip();
  }

  @override
  Future<void> updateTripStatusOffline(TripEntity trip) async {
    final updatedTrip = trip.copyWith(vectorClockClient: trip.vectorClockClient + 1);
    await LocalStorageService.saveActiveTrip(updatedTrip);
  }

  @override
  Future<void> syncTripUpdates(TripEntity trip) async {
    try {
      final response = await networkClient.put(
        "/api/v1/trips/${trip.id}",
        data: {
          "status": trip.status,
          "vector_clock_client": trip.vectorClockClient,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        final serverTrip = TripModel.fromJson(response.data);
        await LocalStorageService.saveActiveTrip(serverTrip);
      }
    } catch (_) {
      // Keep offline cache
    }
  }
}
