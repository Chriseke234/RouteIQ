import '../../domain/entities/trip.dart';

class TripModel extends TripEntity {
  const TripModel({
    required super.id,
    required super.driverId,
    required super.vehicleId,
    required super.status,
    super.startTime,
    super.endTime,
    required super.vectorClockClient,
    required super.vectorClockServer,
    required super.nodes,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    var nodesList = (json['nodes'] as List? ?? [])
        .map((n) => TripNodeModel.fromJson(n))
        .toList();
    
    return TripModel(
      id: json['id'] ?? '',
      driverId: json['driver_id'] ?? '',
      vehicleId: json['vehicle_id'] ?? '',
      status: json['status'] ?? 'pending',
      startTime: json['start_time'] != null ? DateTime.tryParse(json['start_time']) : null,
      endTime: json['end_time'] != null ? DateTime.tryParse(json['end_time']) : null,
      vectorClockClient: json['vector_clock_client'] ?? 0,
      vectorClockServer: json['vector_clock_server'] ?? 0,
      nodes: nodesList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'driver_id': driverId,
      'vehicle_id': vehicleId,
      'status': status,
      'start_time': startTime?.toIso8601String(),
      'end_time': endTime?.toIso8601String(),
      'vector_clock_client': vectorClockClient,
      'vector_clock_server': vectorClockServer,
      'nodes': nodes.map((n) => (n as TripNodeModel).toJson()).toList(),
    };
  }
}

class TripNodeModel extends TripNodeEntity {
  const TripNodeModel({
    required super.id,
    required super.tripId,
    required super.sequenceIndex,
    required super.nodeStatus,
    required super.address,
    required super.latitude,
    required super.longitude,
    super.eta,
    super.actualArrival,
    super.actualDeparture,
  });

  factory TripNodeModel.fromJson(Map<String, dynamic> json) {
    return TripNodeModel(
      id: json['id'] ?? '',
      tripId: json['trip_id'] ?? '',
      sequenceIndex: json['sequence_index'] ?? 0,
      nodeStatus: json['node_status'] ?? 'pending',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      eta: json['eta'] != null ? DateTime.tryParse(json['eta']) : null,
      actualArrival: json['actual_arrival'] != null ? DateTime.tryParse(json['actual_arrival']) : null,
      actualDeparture: json['actual_departure'] != null ? DateTime.tryParse(json['actual_departure']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'sequence_index': sequenceIndex,
      'node_status': nodeStatus,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
      'eta': eta?.toIso8601String(),
      'actual_arrival': actualArrival?.toIso8601String(),
      'actual_departure': actualDeparture?.toIso8601String(),
    };
  }
}
