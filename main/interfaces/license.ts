export interface ILicense {
  id: number;
  activation_key: string;
  expires_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}