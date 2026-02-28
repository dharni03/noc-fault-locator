import { TopologyNode } from '../types';

export interface MLTelemetryData {
  sector: string;
  lat: number;
  loss: number;
  jitter: number;
  opt: number;
  crc: number;
  status: number;
  cpu: number;
  snmp: number;
  hop: number;
}

export interface MLDiagnosisResponse {
  prediction_error?: string;
  category?: string;
  fault_type?: string;
  ai_confidence_pct?: number;
  isolated_node?: string;
  diagnosis?: any;
  [key: string]: any;
}

/** The structured result we return to the frontend */
export interface MLDiagnosisResult {
  faultLabel: string;
  category: string;
  aiConfidence: number;
  isolatedNode: string;
}

/**
 * Generates somewhat realistic random telemetry data for a node to feed to the ML model.
 */
export function generateRandomTelemetry(node: TopologyNode): MLTelemetryData {
  // Determine sector based on node type roughly
  const sectors = ["Household", "Industries", "Public"];
  let sector = "Public";
  if (node.nodeType === "ONT" || node.nodeType === "OLT") {
    sector = Math.random() > 0.5 ? "Household" : "Industries";
  }

  // Generate values that look like a failing or degraded node
  return {
    sector,
    lat: parseFloat((Math.random() * 100 + 20).toFixed(2)), // 20ms to 120ms latency
    loss: parseFloat((Math.random() * 10 + 0.5).toFixed(2)), // 0.5% to 10.5% packet loss
    jitter: parseFloat((Math.random() * 20 + 1).toFixed(2)), // 1ms to 21ms jitter
    opt: parseFloat((-(Math.random() * 15 + 15)).toFixed(2)), // -15dBm to -30dBm optical power
    crc: Math.floor(Math.random() * 500) + 10, // 10 to 510 CRC errors
    status: 1, // 1 for alert/down state
    cpu: parseFloat((Math.random() * 40 + 50).toFixed(2)), // 50% to 90% CPU
    snmp: Math.floor(Math.random() * 3), // 0, 1, or 2 SNMP traps
    hop: Math.floor(Math.random() * 5) + 1, // 1 to 5 hops
  };
}

/**
 * Calls the FastAPI backend on the Mac with the generated telemetry data.
 * Falls back to a mock string if network fails.
 */
export async function diagnoseNodeWithML(telemetry: MLTelemetryData): Promise<MLDiagnosisResult> {
  const fallback: MLDiagnosisResult = {
    faultLabel: "UNKNOWN FAILURE (ML OFFLINE)",
    category: "Unknown",
    aiConfidence: 0,
    isolatedNode: "N/A",
  };

  try {
    const response = await fetch("http://10.9.198.245:8000/diagnose", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(telemetry)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: MLDiagnosisResponse = await response.json();
    console.log("ML Backend Full Response:", result);

    // The backend returns { status: 'success', diagnosis: { prediction_error, category, ... } }
    if (result.diagnosis && typeof result.diagnosis === 'object') {
      const d = result.diagnosis as any;
      return {
        faultLabel: typeof d.prediction_error === 'string' ? d.prediction_error : (typeof d.fault_type === 'string' ? d.fault_type : 'ML Fault'),
        category: typeof d.category === 'string' ? d.category : 'Unknown',
        aiConfidence: typeof d.ai_confidence_pct === 'number' ? d.ai_confidence_pct : 0,
        isolatedNode: typeof d.isolated_node === 'string' ? d.isolated_node : 'N/A',
      };
    }

    // Root level fields
    return {
      faultLabel: typeof result.prediction_error === 'string' ? result.prediction_error : (typeof result.fault_type === 'string' ? result.fault_type : 'ML Fault'),
      category: typeof result.category === 'string' ? result.category : 'Unknown',
      aiConfidence: typeof result.ai_confidence_pct === 'number' ? result.ai_confidence_pct : 0,
      isolatedNode: typeof result.isolated_node === 'string' ? result.isolated_node : 'N/A',
    };

  } catch (error) {
    console.error("Failed to reach the ML backend:", error);
    return fallback;
  }
}
