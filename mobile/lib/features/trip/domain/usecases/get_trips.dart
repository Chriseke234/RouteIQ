import '../entities/trip.dart';
import '../repositories/trip_repository.dart';

class GetActiveTripUseCase {
  final TripRepository repository;

  GetActiveTripUseCase(this.repository);

  Future<TripEntity?> execute() async {
    return await repository.getActiveTrip();
  }
}
