import { Types } from "mongoose";

export interface IVehicle {
  _id?: Types.ObjectId;            
  user: Types.ObjectId;         
  make?: string;                     
  model: string;                    
  licensePlate: string;             
  type?: string;
  capacity?: number;
  isActive: boolean;                
  isDeleted?: boolean;
}