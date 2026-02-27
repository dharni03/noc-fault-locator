export type SegmentType = 'NOC' | 'Aggregation' | 'Block' | 'GP' | 'OLT' | 'ONT';

export interface Fault {
  id: string;
  fault_layer: string;
  segment_type: SegmentType;
  path: string;
  status: string;
  error_type: 'Software' | 'Hardware' | 'None';
  detection_time: string;
  severity: 'Critical' | 'Major' | 'Minor';
  color: string;
}

export const NETWORK_HIERARCHY: SegmentType[] = ['NOC', 'Aggregation', 'Block', 'GP', 'OLT', 'ONT'];
