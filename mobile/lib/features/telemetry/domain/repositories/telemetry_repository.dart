import '../entities/telemetry.dart';

abstract class TelemetryRepository {
  Future<void> recordTelemetry(TelemetryEntity telemetry);
  Future<List<TelemetryEntity>> getUnsyncedTelemetry(int limit);
  Future<void> syncTelemetry();
}
