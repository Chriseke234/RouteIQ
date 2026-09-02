import '../../domain/entities/telemetry.dart';
import '../../domain/repositories/telemetry_repository.dart';
import '../models/telemetry_model.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../../core/offline/sync_worker.dart';

class TelemetryRepositoryImpl implements TelemetryRepository {
  @override
  Future<void> recordTelemetry(TelemetryEntity telemetry) async {
    final model = TelemetryModel.fromEntity(telemetry);
    await LocalStorageService.queueTelemetryPoint(model.toJson());
  }

  @override
  Future<List<TelemetryEntity>> getUnsyncedTelemetry(int limit) async {
    final list = await LocalStorageService.getPendingTelemetry();
    return list.take(limit).map((data) => TelemetryModel.fromJson(data)).toList();
  }

  @override
  Future<void> syncTelemetry() async {
    await SyncScheduler.runTelemetrySync();
  }
}
