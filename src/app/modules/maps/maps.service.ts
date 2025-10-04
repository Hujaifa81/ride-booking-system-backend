/* eslint-disable @typescript-eslint/no-explicit-any */
import { envVars } from "../../config/env";
import axios from "axios";
import AppError from "../../errorHelpers/AppError";


const getCoordinates=async(address:string)=>{
    // Use Google Maps Geocoding API to get coordinates
    const apiKey = envVars.Google_Maps_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try{
        const response = await axios.get(url)
        console.log(response.data); // Add this before checking status
        if(response.data.status === "OK"){
            const location = response.data.results[0].geometry.location;
            return { lat: location.lat, lng: location.lng };
        } else{
            throw new AppError(400, "Unable to fetch coordinates. Please check the address and try again.");
        }
    }
    catch(error){
        console.log(error);
        throw new AppError(500, "Error fetching coordinates from Google Maps API");
    }

}

// Add this type at the top
export interface PlacePrediction {
  description: string;
  place_id: string;
  types: string[];
  // Add other fields as needed from the API response
}

const getSuggestions = async (input: string): Promise<PlacePrediction[]> => {
    const apiKey = envVars.Google_Maps_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      return response.data.predictions.map((prediction: any) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        types: prediction.types,
        // Add other fields as needed
      }));
    } else {
      throw new AppError(400, "Unable to fetch suggestions. Please check the input and try again.");
    }
  }
  catch (error) {
    console.log(error);
    throw new AppError(500, "Error fetching suggestions from Google Maps API");
  }
};

export const mapsService={
    getCoordinates,
    getSuggestions
}