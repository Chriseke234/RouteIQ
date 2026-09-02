import '../entities/telemetry.dart';
import '../repositories/telemetry_repository.dart';

class TrackLocationUseCase {
  final TelemetryRepository repository;

  TrackLocationUseCase(this.repository);

  Future<void> execute(TelemetryEntity telemetry) async {
    return await repository.recordTelemetry(telemetry);
  }
}
