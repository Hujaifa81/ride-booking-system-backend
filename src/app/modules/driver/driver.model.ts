import { model, Schema } from "mongoose";
import { DriverStatus, IDriver, ILocation } from "./driver.interface";

export const locationSchema = new Schema<ILocation>({
  type: {
    type: String,
    enum: ["Point"], // GeoJSON Point type
    required: true,
    default: "Point"
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function (arr) {
        return arr.length === 2 &&
          arr[0] >= -180 && arr[0] <= 180 &&
          arr[1] >= -90 && arr[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude]'
    }
  }
}, {
  _id: false,
  versionKey: false
});

const driverSchema = new Schema<IDriver>({
  user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  licenseNumber: { type: String, required: true, unique: true },
  rating: { type: Number, default: 0 },
  // vehicles: [{ type: Schema.Types.ObjectId, ref: 'Vehicle', default: [] }],
  status: { type: String, enum: Object.values(DriverStatus), default: DriverStatus.OFFLINE },
  approved: { type: Boolean, default: false },
  location: { type: locationSchema, default: null },
  activeRide: { type: Schema.Types.ObjectId, ref: 'Ride', default: null },
  earnings: { type: Number, default: 0 },
  isSuspended: { type: Boolean, default: false }
}, {
  timestamps: true,
  versionKey: false
})

driverSchema.index({ location: "2dsphere" });
export const Driver = model<IDriver>('Driver', driverSchema);