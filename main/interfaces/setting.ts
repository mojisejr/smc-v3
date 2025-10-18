export interface ISetting {
  id: number;
  ku_port: string;
  ku_baudrate: number;
  available_slots: number;
  max_user: number;
  service_code: string;
  indi_port: string;
  indi_baudrate: number;
  // CU12 Protocol Configuration
  protocol_type: "KU16" | "CU12";
  cu12_address: number;
  cu12_connection_type: "tcp" | "rs485";
  cu12_host: string;
  cu12_port: number;
  cu12_baudrate?: number;
  organization?: string;
  customer_name?: string;
  activated_key?: string;
  max_log_counts?: number;
}

export interface IUpdateSetting {
  ku_port: string;
  ku_baudrate: number;
}
