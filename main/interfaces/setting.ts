export interface ISetting {
  id: number;
  ku_port: string;
  ku_baudrate: number;
  available_slots: number;
  max_user: number;
  service_code: string;
  indi_port: string;
  indi_baudrate: number;
  organization?: string;
  customer_name?: string;
  activated_key?: string;
  max_log_counts?: number;
}

export interface IUpdateSetting {
  ku_port?: string;
  ku_baudrate?: number;
  available_slots?: number;
  max_user?: number;
  service_code?: string;
  indi_port?: string;
  indi_baudrate?: number;
  organization?: string;
  customer_name?: string;
  activated_key?: string;
  max_log_counts?: number;
}
