import '../entities/trip.dart';

abstract class TripRepository {
  Future<TripEntity?> getActiveTrip();
  Future<void> updateTripStatusOffline(TripEntity trip);
  Future<void> syncTripUpdates(TripEntity trip);
}
