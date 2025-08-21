import { Types } from "mongoose";

export interface IVehicle {
  _id?: Types.ObjectId;            
  driverId: Types.ObjectId;         
  make?: string;                     
  model: string;                    
  licensePlate: string;             
  type?: string;
  capacity?: number;
  isActive: boolean;                
  isDeleted?: boolean;
}